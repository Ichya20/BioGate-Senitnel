<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. roles table
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique(); // Super Admin, Admin, Staff
            $table->timestamps();
        });

        // 2. users table
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->foreignId('role_id')->constrained('roles');
            $table->string('normal_phrase');
            $table->string('duress_phrase');
            $table->timestamps();
        });

        // 3. access_logs table
        Schema::create('access_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users');
            $table->enum('status', ['GRANTED', 'DENIED']);
            $table->boolean('is_duress')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('access_logs');
        Schema::dropIfExists('users');
        Schema::dropIfExists('roles');
    }
};
