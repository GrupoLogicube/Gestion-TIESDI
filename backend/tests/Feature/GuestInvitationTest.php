<?php

namespace Tests\Feature;

use App\Mail\GuestInvitationMail;
use App\Models\Event;
use App\Models\EventModule;
use App\Models\User;
use App\Models\UserSmtpSetting;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Contracts\Mail\Mailer as MailerContract;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Mail\PendingMail;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Mockery;
use Symfony\Component\Mailer\Exception\TransportException;
use Tests\TestCase;

class GuestInvitationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    private function createEventWithRsvp(User $organizer): Event
    {
        $event = Event::create([
            'organizer_id' => $organizer->id,
            'title' => 'Fiesta de Gala',
            'location' => 'Club Campestre',
            'location_url' => 'https://www.google.com/maps/search/?api=1&query=-0.1807,-78.4678',
            'starts_at' => now()->addDays(15),
            'status' => 'active',
        ]);

        foreach (EventModule::AVAILABLE_MODULES as $moduleKey) {
            EventModule::create([
                'event_id' => $event->id,
                'module_key' => $moduleKey,
                'is_enabled' => true,
            ]);
        }

        return $event;
    }

    public function test_sending_email_never_falls_back_to_env_when_smtp_mode_or_saved_settings_missing(): void
    {
        $organizer = User::factory()->create();
        $organizer->assignRole('organizer');
        $event = $this->createEventWithRsvp($organizer);

        $event->guests()->create([
            'name' => 'Invitado Uno',
            'email' => 'uno@example.com',
            'passes_count' => 1,
        ]);

        // Missing smtp_mode -> 422
        $this->actingAs($organizer, 'sanctum')
            ->postJson("/api/events/{$event->id}/guests/invitations/email", [])
            ->assertStatus(422);

        // smtp_mode = 'saved' without any saved UserSmtpSetting -> 422
        $this->actingAs($organizer, 'sanctum')
            ->postJson("/api/events/{$event->id}/guests/invitations/email", [
                'smtp_mode' => 'saved',
            ])
            ->assertStatus(422);
    }

    public function test_organizer_can_send_via_custom_smtp_and_save_credentials_for_future_saved_sends(): void
    {
        $organizer = User::factory()->create(['name' => 'Carlos Org']);
        $organizer->assignRole('organizer');
        $event = $this->createEventWithRsvp($organizer);

        $guest = $event->guests()->create([
            'name' => 'Lucía',
            'email' => 'lucia@example.com',
            'passes_count' => 3,
        ]);

        $event->guests()->create([
            'name' => 'Pedro Sin Correo',
            'email' => null,
            'passes_count' => 1,
        ]);

        $pendingMail = Mockery::mock(PendingMail::class);
        $pendingMail->shouldReceive('send')
            ->twice()
            ->with(Mockery::on(function ($mailable) use ($guest) {
                return $mailable instanceof GuestInvitationMail
                    && $mailable->fromEmail === 'eventos@outlook.com'
                    && $mailable->guest->id === $guest->id;
            }));

        $mockMailer = Mockery::mock(MailerContract::class);
        $mockMailer->shouldReceive('to')
            ->twice()
            ->with('lucia@example.com')
            ->andReturn($pendingMail);

        Mail::shouldReceive('build')
            ->twice()
            ->with(Mockery::on(function (array $config) {
                return $config['transport'] === 'smtp'
                    && $config['host'] === 'smtp-mail.outlook.com'
                    && $config['port'] === 587
                    && $config['username'] === 'eventos@outlook.com'
                    && $config['password'] === 'app-secret-pass';
            }))
            ->andReturn($mockMailer);

        // 1) Custom mode with save_credentials: true
        $this->actingAs($organizer, 'sanctum')
            ->postJson("/api/events/{$event->id}/guests/invitations/email", [
                'smtp_mode' => 'custom',
                'smtp_email' => 'eventos@outlook.com',
                'smtp_password' => 'app-secret-pass',
                'save_credentials' => true,
            ])
            ->assertOk()
            ->assertJsonPath('data.sent', 1)
            ->assertJsonPath('data.skipped', 1)
            ->assertJsonPath('data.smtp_mode', 'custom')
            ->assertJsonPath('data.sender_email', 'eventos@outlook.com')
            ->assertJsonPath('data.credentials_saved', true);

        $this->assertDatabaseHas('user_smtp_settings', [
            'user_id' => $organizer->id,
            'from_email' => 'eventos@outlook.com',
            'host' => 'smtp-mail.outlook.com',
            'port' => 587,
        ]);

        // 2) Subsequent 1-click send using smtp_mode: 'saved'
        $this->actingAs($organizer, 'sanctum')
            ->postJson("/api/events/{$event->id}/guests/invitations/email", [
                'smtp_mode' => 'saved',
            ])
            ->assertOk()
            ->assertJsonPath('data.sent', 1)
            ->assertJsonPath('data.smtp_mode', 'saved')
            ->assertJsonPath('data.sender_email', 'eventos@outlook.com');
    }

    public function test_invalid_smtp_credentials_return_422_and_do_not_save_credentials(): void
    {
        $organizer = User::factory()->create();
        $organizer->assignRole('organizer');
        $event = $this->createEventWithRsvp($organizer);

        $event->guests()->create([
            'name' => 'Invitado',
            'email' => 'inv@example.com',
            'passes_count' => 1,
        ]);

        // Corporate domain without host/port -> 422
        $this->actingAs($organizer, 'sanctum')
            ->postJson("/api/events/{$event->id}/guests/invitations/email", [
                'smtp_mode' => 'custom',
                'smtp_email' => 'contacto@empresa-custom.ec',
                'smtp_password' => 'pass',
                'save_credentials' => true,
            ])
            ->assertStatus(422);

        // Simulated SMTP transport failure -> 422 and credentials NOT saved
        $pendingMail = Mockery::mock(PendingMail::class);
        $pendingMail->shouldReceive('send')
            ->once()
            ->andThrow(new TransportException('535 5.7.8 Username and Password not accepted'));

        $mockMailer = Mockery::mock(MailerContract::class);
        $mockMailer->shouldReceive('to')->once()->andReturn($pendingMail);

        Mail::shouldReceive('build')->once()->andReturn($mockMailer);

        $this->actingAs($organizer, 'sanctum')
            ->postJson("/api/events/{$event->id}/guests/invitations/email", [
                'smtp_mode' => 'custom',
                'smtp_email' => 'wrong@gmail.com',
                'smtp_password' => 'bad-password',
                'save_credentials' => true,
            ])
            ->assertStatus(422);

        $this->assertNull(UserSmtpSetting::where('user_id', $organizer->id)->first());
    }

    public function test_organizer_can_start_poll_and_cancel_ephemeral_whatsapp_session(): void
    {
        Http::fake([
            '*/sessions' => Http::response([
                'session_id' => 'wa-sess-123',
                'status' => 'waiting_qr',
                'total' => 1,
            ], 201),
            '*/sessions/wa-sess-123' => Http::sequence()
                ->push([
                    'session_id' => 'wa-sess-123',
                    'status' => 'waiting_qr',
                    'qr' => 'data:image/png;base64,FAKEQR',
                    'total' => 1,
                    'sent' => 0,
                    'failed' => 0,
                    'session_closed' => false,
                ], 200)
                ->push(['message' => 'Sesión cancelada y eliminada de forma segura.'], 200),
        ]);

        $organizer = User::factory()->create();
        $organizer->assignRole('organizer');
        $event = $this->createEventWithRsvp($organizer);

        $guest = $event->guests()->create([
            'name' => 'Andrés',
            'phone' => '+593999111222',
            'passes_count' => 2,
        ]);

        $this->actingAs($organizer, 'sanctum')
            ->postJson("/api/events/{$event->id}/guests/invitations/whatsapp/start", [
                'guest_ids' => [$guest->id],
            ])
            ->assertCreated()
            ->assertJsonPath('data.session_id', 'wa-sess-123')
            ->assertJsonPath('data.status', 'waiting_qr');

        $this->actingAs($organizer, 'sanctum')
            ->getJson("/api/events/{$event->id}/guests/invitations/whatsapp/wa-sess-123")
            ->assertOk()
            ->assertJsonPath('data.qr', 'data:image/png;base64,FAKEQR');

        $this->actingAs($organizer, 'sanctum')
            ->deleteJson("/api/events/{$event->id}/guests/invitations/whatsapp/wa-sess-123")
            ->assertOk();
    }
}
