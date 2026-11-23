<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BudgetItemController;
use App\Http\Controllers\Api\EventController;
use App\Http\Controllers\Api\EventModuleController;
use App\Http\Controllers\Api\EventProviderController;
use App\Http\Controllers\Api\GuestController;
use App\Http\Controllers\Api\GuestInvitationController;
use App\Http\Controllers\Api\InventoryItemController;
use App\Http\Controllers\Api\OAuthController;
use App\Http\Controllers\Api\ProviderController;
use App\Http\Controllers\Api\ProviderPortalController;
use App\Http\Controllers\Api\RsvpController;
use App\Http\Controllers\Api\ScheduleItemController;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\UserSmtpSettingController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);

    Route::get('/oauth/{provider}/redirect', [OAuthController::class, 'redirect']);
    Route::match(['get', 'post'], '/oauth/{provider}/callback', [OAuthController::class, 'callback']);
});

// Public RSVP endpoints (Magic Links, no auth required)
Route::prefix('rsvp')->group(function () {
    Route::get('/{token}', [RsvpController::class, 'show']);
    Route::post('/{token}/confirm', [RsvpController::class, 'confirm']);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'me']);

    // Per-User Encrypted SMTP Settings
    Route::prefix('user/smtp-settings')->group(function () {
        Route::get('/', [UserSmtpSettingController::class, 'show']);
        Route::put('/', [UserSmtpSettingController::class, 'update']);
        Route::post('/test', [UserSmtpSettingController::class, 'test']);
        Route::delete('/', [UserSmtpSettingController::class, 'destroy']);
    });

    // Core Events & Modular Configuration
    Route::apiResource('events', EventController::class);
    Route::put('/events/{event}/modules', [EventModuleController::class, 'update']);

    // Organizer Global Provider Directory
    Route::apiResource('providers', ProviderController::class);

    // Nested Event Modules (protected by EnsureModuleEnabled middleware)
    Route::prefix('events/{event}')->group(function () {
        // Providers Module
        Route::middleware('module:providers')->group(function () {
            Route::get('/providers', [EventProviderController::class, 'index']);
            Route::post('/providers', [EventProviderController::class, 'store']);
            Route::match(['put', 'patch'], '/providers/{eventProvider}', [EventProviderController::class, 'update']);
            Route::delete('/providers/{eventProvider}', [EventProviderController::class, 'destroy']);

            Route::post('/providers/{eventProvider}/checklist', [EventProviderController::class, 'storeChecklistItem']);
            Route::match(['put', 'patch'], '/providers/{eventProvider}/checklist/{checklistItem}', [EventProviderController::class, 'updateChecklistItem']);
            Route::delete('/providers/{eventProvider}/checklist/{checklistItem}', [EventProviderController::class, 'destroyChecklistItem']);
        });

        // RSVP / Guests Module
        Route::middleware('module:rsvp')->group(function () {
            Route::post('/guests/invitations/email', [GuestInvitationController::class, 'sendEmail']);
            Route::post('/guests/invitations/whatsapp/start', [GuestInvitationController::class, 'startWhatsapp']);
            Route::get('/guests/invitations/whatsapp/{sessionId}', [GuestInvitationController::class, 'whatsappStatus']);
            Route::delete('/guests/invitations/whatsapp/{sessionId}', [GuestInvitationController::class, 'cancelWhatsapp']);

            Route::apiResource('guests', GuestController::class);
            Route::post('/guests/{guest}/magic-link', [GuestController::class, 'generateMagicLink']);
        });

        // Inventory Module
        Route::middleware('module:inventory')->group(function () {
            Route::apiResource('inventory', InventoryItemController::class)
                ->parameters(['inventory' => 'inventoryItem']);
            Route::patch('/inventory/{inventoryItem}/check-in', [InventoryItemController::class, 'checkIn']);
        });

        // Complementary Modules
        Route::middleware('module:schedule')->group(function () {
            Route::apiResource('schedule', ScheduleItemController::class)
                ->parameters(['schedule' => 'scheduleItem']);
        });

        Route::middleware('module:budget')->group(function () {
            Route::apiResource('budget', BudgetItemController::class)
                ->parameters(['budget' => 'budgetItem']);
        });

        Route::middleware('module:tasks')->group(function () {
            Route::apiResource('tasks', TaskController::class);
        });
    });

    // Authenticated Provider Portal
    Route::prefix('provider')->group(function () {
        Route::get('/events', [ProviderPortalController::class, 'events']);
        Route::get('/events/{event}', [ProviderPortalController::class, 'showEvent'])->middleware('module:providers');
        Route::get('/events/{event}/schedule', [ProviderPortalController::class, 'schedule'])->middleware('module:schedule');
        Route::patch('/checklist/{checklistItem}/toggle', [ProviderPortalController::class, 'toggleChecklistItem']);
    });
});
