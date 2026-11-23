<?php

namespace Tests\Feature;

use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Socialite\Contracts\User as SocialiteUser;
use Laravel\Socialite\Facades\Socialite;
use Mockery;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_user_can_register_login_fetch_profile_and_logout(): void
    {
        $registerResponse = $this->postJson('/api/auth/register', [
            'name' => 'Ana Organizador',
            'email' => 'ana@example.com',
            'password' => 'Secret123!',
            'password_confirmation' => 'Secret123!',
            'device_name' => 'web-test',
        ]);

        $registerResponse
            ->assertCreated()
            ->assertJsonStructure(['token', 'token_type', 'user' => ['id', 'name', 'email', 'roles', 'permissions']])
            ->assertJsonPath('user.roles.0', 'organizer');

        $token = $registerResponse->json('token');

        $this->withToken($token)
            ->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('email', 'ana@example.com')
            ->assertJsonPath('roles.0', 'organizer');

        $this->withToken($token)
            ->postJson('/api/auth/logout')
            ->assertOk();

        $loginResponse = $this->postJson('/api/auth/login', [
            'email' => 'ana@example.com',
            'password' => 'Secret123!',
        ]);

        $loginResponse
            ->assertOk()
            ->assertJsonStructure(['token', 'user'])
            ->assertJsonPath('user.email', 'ana@example.com');
    }

    public function test_oauth_stateless_callback_creates_organizer_and_returns_token(): void
    {
        $socialUser = Mockery::mock(SocialiteUser::class);
        $socialUser->shouldReceive('getId')->andReturn('google-123');
        $socialUser->shouldReceive('getEmail')->andReturn('oauth@example.com');
        $socialUser->shouldReceive('getName')->andReturn('OAuth User');
        $socialUser->shouldReceive('getAvatar')->andReturn('https://example.com/avatar.png');
        $socialUser->token = 'oauth-token';
        $socialUser->refreshToken = null;
        $socialUser->expiresIn = 3600;

        Socialite::shouldReceive('driver->stateless->user')->once()->andReturn($socialUser);

        $response = $this->getJson('/api/auth/oauth/google/callback');

        $response
            ->assertOk()
            ->assertJsonStructure(['token', 'token_type', 'user' => ['id', 'email', 'roles', 'permissions']])
            ->assertJsonPath('user.email', 'oauth@example.com')
            ->assertJsonPath('user.roles.0', 'organizer');

        $this->assertDatabaseHas('social_accounts', [
            'provider' => 'google',
            'provider_id' => 'google-123',
        ]);
    }
}

