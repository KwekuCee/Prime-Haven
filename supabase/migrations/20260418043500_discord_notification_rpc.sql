-- Create a database function to post order notifications to Discord
-- This uses pg_net to make HTTP requests directly from the database,
-- bypassing the need for edge function deployment.
-- The Discord bot token must be stored in system_settings with key 'discord_bot_token'.

-- First, ensure the discord_bot_token is in system_settings
-- (The user must manually set the token value in the Supabase Dashboard → Table Editor → system_settings)
INSERT INTO public.system_settings (key, value, description, updated_at)
VALUES (
  'discord_bot_token',
  '"REPLACE_WITH_YOUR_DISCORD_BOT_TOKEN"',
  'Discord bot token for posting order notifications',
  now()
)
ON CONFLICT (key) DO NOTHING;

-- Also store the channel mapping
INSERT INTO public.system_settings (key, value, description, updated_at)
VALUES (
  'discord_order_channels',
  '{"graphic-design": "1470244531680186478", "app-design": "1470244675951529984", "web-dev": "1470244738073497704"}',
  'Discord channel IDs for order notifications by category',
  now()
)
ON CONFLICT (key) DO NOTHING;

-- Create the RPC function for posting to Discord
CREATE OR REPLACE FUNCTION public.notify_discord_order(
  p_service_label text,
  p_service_type text,
  p_tier text,
  p_client_name text,
  p_client_email text,
  p_amount numeric,
  p_discord_category text,
  p_gateway text DEFAULT 'promo',
  p_client_whatsapp text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bot_token text;
  v_channels jsonb;
  v_channel_id text;
  v_embed jsonb;
  v_payload jsonb;
  v_display_amount text;
BEGIN
  -- Get bot token from system_settings
  SELECT (value #>> '{}') INTO v_bot_token
  FROM public.system_settings
  WHERE key = 'discord_bot_token';

  -- Get channel mapping
  SELECT value INTO v_channels
  FROM public.system_settings
  WHERE key = 'discord_order_channels';

  IF v_bot_token IS NULL OR v_bot_token = '' OR v_bot_token = 'REPLACE_WITH_YOUR_DISCORD_BOT_TOKEN' THEN
    RAISE NOTICE 'Discord bot token not configured, skipping notification';
    RETURN;
  END IF;

  -- Look up channel ID
  v_channel_id := v_channels ->> p_discord_category;

  IF v_channel_id IS NULL THEN
    RAISE NOTICE 'No Discord channel for category: %', p_discord_category;
    RETURN;
  END IF;

  -- Format amount
  v_display_amount := 'GH₵' || p_amount::text;

  -- Build Discord embed
  v_embed := jsonb_build_object(
    'title', '🆕 New Client Order: ' || COALESCE(p_service_label, p_service_type),
    'description', 'Order placed via ' || p_gateway,
    'color', 2278109,
    'fields', jsonb_build_array(
      jsonb_build_object('name', '👤 Client', 'value', p_client_name, 'inline', true),
      jsonb_build_object('name', '📧 Email', 'value', p_client_email, 'inline', true),
      jsonb_build_object('name', '📦 Package', 'value', initcap(p_tier), 'inline', true),
      jsonb_build_object('name', '💰 Amount', 'value', v_display_amount, 'inline', true)
    ),
    'footer', jsonb_build_object('text', 'Prime Haven • Client Order (via ' || p_gateway || ')'),
    'timestamp', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  );

  -- Add WhatsApp field if provided
  IF p_client_whatsapp IS NOT NULL AND p_client_whatsapp != '' THEN
    v_embed := jsonb_set(
      v_embed,
      '{fields}',
      (v_embed -> 'fields') || jsonb_build_array(
        jsonb_build_object('name', '📱 WhatsApp', 'value', p_client_whatsapp, 'inline', true)
      )
    );
  END IF;

  v_payload := jsonb_build_object('embeds', jsonb_build_array(v_embed));

  -- Post to Discord using pg_net
  PERFORM net.http_post(
    url := 'https://discord.com/api/v10/channels/' || v_channel_id || '/messages',
    headers := jsonb_build_object(
      'Authorization', 'Bot ' || v_bot_token,
      'Content-Type', 'application/json'
    ),
    body := v_payload
  );
END;
$$;

-- Grant execute to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.notify_discord_order TO anon;
GRANT EXECUTE ON FUNCTION public.notify_discord_order TO authenticated;
