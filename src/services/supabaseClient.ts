/**
 * EduConnect Official Supabase Client
 * Connected to Cloud Project: https://ddievgtuccsqjukirynv.supabase.co
 * Using Safe Client Publishable Key with Row-Level Security
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_URL = 'https://ddievgtuccsqjukirynv.supabase.co';
const DEFAULT_KEY = 'sb_publishable_7-auoV07sqCgnRGBtvkQmA_WyD0NH8d';

/**
 * Robust URL resolver: ensures a valid HTTP/HTTPS URL is always provided
 * even if environment variables are missing, deleted, or misconfigured.
 */
function resolveSupabaseUrl(): string {
  try {
    const envUrl = typeof import.meta !== 'undefined' && import.meta?.env?.VITE_SUPABASE_URL;
    if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
      const trimmed = envUrl.trim();
      if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
        new URL(trimmed); // Validates format
        return trimmed;
      }
    }
  } catch (e) {
    console.warn('Invalid VITE_SUPABASE_URL in env, using default project URL.');
  }
  return DEFAULT_URL;
}

function resolveSupabaseKey(): string {
  try {
    const envKey = typeof import.meta !== 'undefined' && import.meta?.env?.VITE_SUPABASE_ANON_KEY;
    if (envKey && typeof envKey === 'string' && envKey.trim().length > 10) {
      return envKey.trim();
    }
  } catch (e) {
    // fallback
  }
  return DEFAULT_KEY;
}

export const SUPABASE_URL = resolveSupabaseUrl();
export const SUPABASE_ANON_KEY = resolveSupabaseKey();

function initSupabase(): SupabaseClient {
  try {
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  } catch (err) {
    console.warn('Initial createClient error, falling back to default URL:', err);
    return createClient(DEFAULT_URL, DEFAULT_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
}

export const supabase: SupabaseClient = initSupabase();

/**
 * Diagnostic health check to test cloud connectivity
 */
export async function testSupabaseConnection(): Promise<{
  connected: boolean;
  message: string;
  tablesFound?: boolean;
}> {
  try {
    const { data, error } = await supabase
      .from('classes')
      .select('count', { count: 'exact', head: true });

    if (error) {
      if (error.code === '42P01' || error.message.includes('relation "public.classes" does not exist')) {
        return {
          connected: true,
          message: 'تم الاتصال بمشروع Supabase بنجاح! الجداول بحاجة إلى تشغيل ملف schema.sql في SQL Editor.',
          tablesFound: false
        };
      }
      return {
        connected: false,
        message: `خطأ في الاتصال: ${error.message}`
      };
    }

    return {
      connected: true,
      message: 'الاتصال السحابي بقاعدة بيانات Supabase نشط ومؤكد بنسبة 100%.',
      tablesFound: true
    };
  } catch (err: any) {
    return {
      connected: false,
      message: err?.message || 'تعذر الاتصال بـ Supabase.'
    };
  }
}
