<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class BioGateSeeder extends Seeder
{
    public function run(): void
    {
        // Insert Roles
        $superAdminId = DB::table('roles')->insertGetId(['name' => 'Super Admin']);
        $adminId = DB::table('roles')->insertGetId(['name' => 'Admin']);
        $staffId = DB::table('roles')->insertGetId(['name' => 'Staff']);

        // Insert Users (Team Members)
        DB::table('users')->insert([
            [
                'name' => 'Ichya Ulumiddiin',
                'role_id' => $superAdminId,
                'normal_phrase' => 'Akses Sistem Alpha',
                'duress_phrase' => 'Akses Sistem Darurat',
                'created_at' => now(),
            ],
            [
                'name' => 'Abid Fadhilah Mustofa',
                'role_id' => $adminId,
                'normal_phrase' => 'Buka Lab Enam',
                'duress_phrase' => 'Buka Lab Darurat',
                'created_at' => now(),
            ],
            [
                'name' => 'Iklil Bahy Sabaiki',
                'role_id' => $staffId,
                'normal_phrase' => 'Mulai Analisis Data',
                'duress_phrase' => 'Hentikan Analisis Darurat',
                'created_at' => now(),
            ],
            [
                'name' => 'Nathan Domuni Pasaribu',
                'role_id' => $staffId,
                'normal_phrase' => 'Verifikasi Keamanan',
                'duress_phrase' => 'Keamanan Terancam',
                'created_at' => now(),
            ],
            [
                'name' => 'Nashir Khoirul Huda',
                'role_id' => $staffId,
                'normal_phrase' => 'Otorisasi Modul',
                'duress_phrase' => 'Modul Darurat',
                'created_at' => now(),
            ],
            [
                'name' => 'Arif Kurniawan',
                'role_id' => $staffId,
                'normal_phrase' => 'Aktifkan Protokol',
                'duress_phrase' => 'Protokol Darurat',
                'created_at' => now(),
            ],
        ]);
    }
}
