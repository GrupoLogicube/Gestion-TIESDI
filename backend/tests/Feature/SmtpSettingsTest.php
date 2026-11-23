<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\UserSmtpSetting;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Mail\Mailer;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Mockery;
use Symfony\Component\Mailer\Exception\TransportException;
use Tests\TestCase;

class SmtpSettingsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_user_can_save_fetch_and_delete_encrypted_smtp_settings_with_auto_detection(): void
    {
        $organizer = User::factory()->create(['email' => 'ana@gmail.com']);
        $organizer->assignRole('organizer');

        // Initially not configured
        $this->actingAs($organizer, 'sanctum')
            ->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('has_smtp_configured', false)
            ->assertJsonPath('smtp_email', null);

        $this->actingAs($organizer, 'sanctum')
            ->getJson('/api/user/smtp-settings')
            ->assertOk()
            ->assertJsonPath('data', null);

        // Save Gmail without host/port/encryption -> auto-detects smtp.gmail.com:587 tls
        $putResponse = $this->actingAs($organizer, 'sanctum')
            ->putJson('/api/user/smtp-settings', [
                'from_email' => 'ana@gmail.com',
                'password' => 'super-secret-app-pass',
            ]);

        $putResponse
            ->assertOk()
            ->assertJsonPath('data.from_email', 'ana@gmail.com')
            ->assertJsonPath('data.host', 'smtp.gmail.com')
            ->assertJsonPath('data.port', 587)
            ->assertJsonPath('data.encryption', 'tls')
            ->assertJsonMissingPath('data.password');

        // Verify raw DB column is encrypted (not plaintext)
        $rawRow = DB::table('user_smtp_settings')->where('user_id', $organizer->id)->first();
        $this->assertNotNull($rawRow);
        $this->assertNotSame('super-secret-app-pass', $rawRow->password);

        // Verify Eloquent decrypts transparently
        $setting = UserSmtpSetting::where('user_id', $organizer->id)->first();
        $this->assertSame('super-secret-app-pass', $setting->password);

        // GET /api/user/smtp-settings never leaks password
        $this->actingAs($organizer, 'sanctum')
            ->getJson('/api/user/smtp-settings')
            ->assertOk()
            ->assertJsonPath('data.from_email', 'ana@gmail.com')
            ->assertJsonMissingPath('data.password');

        // Profile exposes has_smtp_configured & smtp_email
        $this->actingAs($organizer, 'sanctum')
            ->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('has_smtp_configured', true)
            ->assertJsonPath('smtp_email', 'ana@gmail.com');

        // Delete settings
        $this->actingAs($organizer, 'sanctum')
            ->deleteJson('/api/user/smtp-settings')
            ->assertOk();

        $this->actingAs($organizer, 'sanctum')
            ->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('has_smtp_configured', false)
            ->assertJsonPath('smtp_email', null);
    }

    public function test_auto_detection_for_outlook_yahoo_and_mandatory_host_port_for_corporate_domains(): void
    {
        $organizer = User::factory()->create();
        $organizer->assignRole('organizer');

        // Outlook auto-detection
        $this->actingAs($organizer, 'sanctum')
            ->putJson('/api/user/smtp-settings', [
                'from_email' => 'eventos@hotmail.com',
                'password' => 'outlook-app-pass',
            ])
            ->assertOk()
            ->assertJsonPath('data.host', 'smtp-mail.outlook.com')
            ->assertJsonPath('data.port', 587)
            ->assertJsonPath('data.encryption', 'tls');

        // Yahoo auto-detection
        $this->actingAs($organizer, 'sanctum')
            ->putJson('/api/user/smtp-settings', [
                'from_email' => 'eventos@yahoo.com',
                'password' => 'yahoo-app-pass',
            ])
            ->assertOk()
            ->assertJsonPath('data.host', 'smtp.mail.yahoo.com')
            ->assertJsonPath('data.port', 587);

        // Corporate domain WITHOUT host/port -> 422
        $this->actingAs($organizer, 'sanctum')
            ->putJson('/api/user/smtp-settings', [
                'from_email' => 'invitaciones@miempresa.com',
                'password' => 'corp-pass',
            ])
            ->assertStatus(422);

        // Corporate domain WITH host only (no port) -> 422
        $this->actingAs($organizer, 'sanctum')
            ->putJson('/api/user/smtp-settings', [
                'from_email' => 'invitaciones@miempresa.com',
                'password' => 'corp-pass',
                'host' => 'smtp.miempresa.com',
            ])
            ->assertStatus(422);

        // Corporate domain WITH host and port -> 200
        $this->actingAs($organizer, 'sanctum')
            ->putJson('/api/user/smtp-settings', [
                'from_email' => 'invitaciones@miempresa.com',
                'password' => 'corp-pass',
                'host' => 'smtp.miempresa.com',
                'port' => 465,
                'encryption' => 'ssl',
            ])
            ->assertOk()
            ->assertJsonPath('data.host', 'smtp.miempresa.com')
            ->assertJsonPath('data.port', 465)
            ->assertJsonPath('data.encryption', 'ssl');
    }

    public function test_smtp_connection_test_endpoint_handles_success_and_transport_failure(): void
    {
        $organizer = User::factory()->create();
        $organizer->assignRole('organizer');

        $mockTransportOk = new class
        {
            public function start(): void {}

            public function stop(): void {}
        };

        $mockMailerOk = Mockery::mock(Mailer::class);
        $mockMailerOk->shouldReceive('alwaysFrom')->once();
        $mockMailerOk->shouldReceive('getSymfonyTransport')->once()->andReturn($mockTransportOk);

        Mail::shouldReceive('build')->once()->andReturn($mockMailerOk);

        $this->actingAs($organizer, 'sanctum')
            ->postJson('/api/user/smtp-settings/test', [
                'from_email' => 'test@gmail.com',
                'password' => 'valid-app-pass',
            ])
            ->assertOk();

        $mockTransportFail = new class
        {
            public function start(): void
            {
                throw new TransportException('535 Authentication failed');
            }
        };

        $mockMailerFail = Mockery::mock(Mailer::class);
        $mockMailerFail->shouldReceive('alwaysFrom')->once();
        $mockMailerFail->shouldReceive('getSymfonyTransport')->once()->andReturn($mockTransportFail);

        Mail::shouldReceive('build')->once()->andReturn($mockMailerFail);

        $this->actingAs($organizer, 'sanctum')
            ->postJson('/api/user/smtp-settings/test', [
                'from_email' => 'test@gmail.com',
                'password' => 'wrong-pass',
            ])
            ->assertStatus(422);
    }
}
