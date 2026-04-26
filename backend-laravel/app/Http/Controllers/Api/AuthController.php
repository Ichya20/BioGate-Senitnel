<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    /**
     * POST /api/auth/verify-mfa
     */
    public function verifyMfa(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|integer',
            'spoken_phrase' => 'required|string',
        ]);

        $userId = $validated['user_id'];
        $spoken = trim($validated['spoken_phrase']);

        // Find user with role
        $user = DB::table('users')
            ->join('roles', 'users.role_id', '=', 'roles.id')
            ->select('users.*', 'roles.name as role_name')
            ->where('users.id', $userId)
            ->first();

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        $status = 'DENIED';
        $isDuress = false;
        $response = null;

        // 1. Check Normal Phrase (case-insensitive)
        if (strcasecmp($spoken, $user->normal_phrase) === 0) {
            $status = 'GRANTED';
            $isDuress = false;
            
            $response = [
                'status' => 'success',
                'token' => Str::random(60),
                'user' => [
                    'name' => $user->name,
                    'role' => $user->role_name
                ],
                'redirect' => Str::slug($user->role_name) . '-dashboard'
            ];
        } 
        // 2. Check Duress Phrase
        elsif (strcasecmp($spoken, $user->duress_phrase) === 0) {
            $status = 'GRANTED';
            $isDuress = true;

            // Trigger silent alarm
            Log::alert("SECURITY BREACH DETECTED: Duress protocol activated by User ID {$userId} ({$user->name}).");
            
            // Mocking a webhook to security agency
            // Http::post('https://security-agency.internal/silent-alarm', ['user_id' => $userId]);

            // Fake success response to fool attacker
            $response = [
                'status' => 'success',
                'token' => Str::random(60),
                'user' => [
                    'name' => $user->name,
                    'role' => $user->role_name
                ],
                'redirect' => Str::slug($user->role_name) . '-dashboard'
            ];
        }

        // 3. Log results
        DB::table('access_logs')->insert([
            'user_id' => $userId,
            'status' => $status,
            'is_duress' => $isDuress,
            'created_at' => now(),
        ]);

        if ($status === 'GRANTED') {
            return response()->json($response);
        }

        return response()->json([
            'status' => 'error',
            'message' => 'Unauthorized: Voice biometric mismatch.'
        ], 401);
    }
}
