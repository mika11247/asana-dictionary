-- Read-only. Keep the output in a restricted location if a copy is needed.
select c.id as customer_id, c.archived as customer_archived,
       array_agg(s.id order by s.id) as legacy_service_link_ids,
       case when g.customer_id is null then 'candidate'
            when g.archived_at is null then 'exclude_existing'
            else 'exclude_archived_membership' end as review_status
from public.crm_customer_services s
join public.crm_customers c on c.id=s.customer_id
left join public.crm_customer_groups g on g.customer_id=c.id and g.group_code='lilly'
where s.location_id=1
group by c.id, c.archived, g.customer_id, g.archived_at
order by c.id;
