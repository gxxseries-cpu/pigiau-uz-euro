CREATE OR REPLACE FUNCTION public.update_push_city(_token text, _city text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.push_subscribers SET city = left(_city, 80)
  WHERE token = _token AND city IS DISTINCT FROM left(_city, 80);
$$;
REVOKE ALL ON FUNCTION public.update_push_city(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_push_city(text, text) TO anon, authenticated;