<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('providers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organizer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('business_name');
            $table->string('category', 100);
            $table->string('contact_name')->nullable();
            $table->string('email')->nullable();
            $table->string('phone', 50)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['organizer_id', 'category']);
            $table->index('user_id');
        });

        Schema::create('event_providers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->foreignId('provider_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('service_description')->nullable();
            $table->decimal('agreed_cost', 12, 2)->default(0);
            $table->decimal('advance_paid', 12, 2)->default(0);
            $table->timestamp('setup_at')->nullable();
            $table->timestamp('show_at')->nullable();
            $table->timestamp('teardown_at')->nullable();
            $table->string('status', 30)->default('pending');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['event_id', 'provider_id']);
            $table->index(['user_id', 'event_id']);
        });

        Schema::create('provider_checklist_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_provider_id')->constrained()->cascadeOnDelete();
            $table->string('item_name');
            $table->unsignedInteger('quantity')->default(1);
            $table->boolean('is_prepared')->default(false);
            $table->timestamp('prepared_at')->nullable();
            $table->foreignId('prepared_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['event_provider_id', 'is_prepared']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('provider_checklist_items');
        Schema::dropIfExists('event_providers');
        Schema::dropIfExists('providers');
    }
};

