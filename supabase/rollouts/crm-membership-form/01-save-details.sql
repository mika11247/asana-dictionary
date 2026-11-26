begin;

create function public.crm_save_customer_membership_details(
  target_customer_id bigint, customer jsonb, relations jsonb, selected_groups text[], selected_brands text[],
  lilly_patch jsonb, nus_category_patch jsonb, nus_profile_patch jsonb
)
returns bigint
language plpgsql security definer set search_path = ''
as $$
declare
  saved_id bigint;
  previous_details jsonb;
begin
  if not public.is_crm_admin() then raise insufficient_privilege; end if;
  if (lilly_patch is not null and ('lilly'=any(selected_groups)) is not true)
    or ((nus_category_patch is not null or nus_profile_patch is not null) and ('nus'=any(selected_groups)) is not true) then
    raise check_violation using message='Dedicated details require explicit membership';
  end if;
  saved_id := public.crm_save_customer_memberships(target_customer_id,customer,relations,selected_groups,selected_brands);

  if lilly_patch is not null then
    select jsonb_build_object('membership',membership,'services',service_codes) into previous_details
    from public.crm_lilly_profiles where customer_id=saved_id;
    previous_details := '{"membership":"unknown","services":[]}'::jsonb || coalesce(previous_details,'{}') || lilly_patch;
    perform public.crm_save_lilly_profile(saved_id, previous_details->>'membership',
      array(select jsonb_array_elements_text(previous_details->'services')),null);
  end if;

  if nus_profile_patch is not null or nus_category_patch is not null then
    perform 1 from public.crm_customer_businesses
      where customer_id=saved_id and business_code='nus' and archived_at is null for update;
    if not found then raise check_violation using message='Active NUS relationship required'; end if;
  end if;
  if nus_profile_patch is not null then
    select to_jsonb(p) into previous_details from public.crm_nus_profiles p where p.customer_id=saved_id;
    previous_details := '{"product_interest":"unknown","business_interest":"unknown","disclosure_status":"unknown","product_proposal_status":"unknown","business_proposal_status":"unknown"}'::jsonb
      || coalesce(previous_details,'{}') || nus_profile_patch;
    perform public.crm_save_nus_profile(saved_id,previous_details,null);
  end if;
  if nus_category_patch is not null then
    perform crm_private.crm_set_nus_category(saved_id,nus_category_patch->>'category',nus_category_patch->>'other_label');
  end if;
  return saved_id;
end;
$$;

revoke all on function public.crm_save_customer_membership_details(bigint,jsonb,jsonb,text[],text[],jsonb,jsonb,jsonb) from public, anon, authenticated, service_role;
grant execute on function public.crm_save_customer_membership_details(bigint,jsonb,jsonb,text[],text[],jsonb,jsonb,jsonb) to authenticated;

commit;
