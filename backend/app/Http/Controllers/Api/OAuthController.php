<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\SocialAccount;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Laravel\Socialite\Facades\Socialite;
use Throwable;

class OAuthController extends Controller
{
    private const ALLOWED_PROVIDERS = ['google', 'apple'];

    public function redirect(string $provider): JsonResponse
    {
        if (! $this->isSupportedProvider($provider)) {
            return response()->json([
                'message' => 'Unsupported OAuth provider.',
            ], 422);
        }

        if (empty(config("services.{$provider}.client_id")) || empty(config("services.{$provider}.client_secret"))) {
            return response()->json([
                'message' => "OAuth credentials for '{$provider}' are not configured in backend/.env.",
            ], 422);
        }

        $url = Socialite::driver($provider)
            ->stateless()
            ->redirect()
            ->getTargetUrl();

        return response()->json([
            'provider' => $provider,
            'url' => $url,
        ]);
    }

    public function callback(Request $request, string $provider): JsonResponse
    {
        if (! $this->isSupportedProvider($provider)) {
            return response()->json([
                'message' => 'Unsupported OAuth provider.',
            ], 422);
        }

        try {
            $socialUser = Socialite::driver($provider)->stateless()->user();
        } catch (Throwable $e) {
            return response()->json([
                'message' => 'OAuth authentication failed.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 401);
        }

        $user = DB::transaction(function () use ($provider, $socialUser) {
            $socialAccount = SocialAccount::where('provider', $provider)
                ->where('provider_id', (string) $socialUser->getId())
                ->first();

            $expiresAt = property_exists($socialUser, 'expiresIn') && $socialUser->expiresIn
                ? now()->addSeconds((int) $socialUser->expiresIn)
                : null;

            if ($socialAccount) {
                $updateData = [
                    'provider_token' => $socialUser->token ?? null,
                    'expires_at' => $expiresAt,
                ];

                if (! empty($socialUser->refreshToken)) {
                    $updateData['provider_refresh_token'] = $socialUser->refreshToken;
                }

                $socialAccount->update($updateData);

                return $socialAccount->user;
            }

            $email = $socialUser->getEmail();
            $user = $email ? User::where('email', $email)->first() : null;

            if (! $user) {
                if (! $email) {
                    abort(422, 'Email address is required from OAuth provider.');
                }

                $user = User::create([
                    'name' => $socialUser->getName() ?: $socialUser->getNickname() ?: 'User',
                    'email' => $email,
                    'avatar_url' => $socialUser->getAvatar(),
                    'email_verified_at' => now(),
                ]);

                $user->assignRole('organizer');
            }

            SocialAccount::create([
                'user_id' => $user->id,
                'provider' => $provider,
                'provider_id' => (string) $socialUser->getId(),
                'provider_token' => $socialUser->token ?? null,
                'provider_refresh_token' => $socialUser->refreshToken ?? null,
                'expires_at' => $expiresAt,
            ]);

            return $user;
        });

        $deviceName = $request->input('device_name', "oauth:{$provider}");
        $token = $user->createToken((string) $deviceName)->plainTextToken;

        return response()->json([
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => (new UserResource($user))->resolve(),
        ]);
    }

    private function isSupportedProvider(string $provider): bool
    {
        return in_array($provider, self::ALLOWED_PROVIDERS, true);
    }
}
