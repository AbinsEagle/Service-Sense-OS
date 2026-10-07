-- Match readings to the device's Bluetooth message (firmware/ssos_main):
-- sensor codes TEMP/TDS/VOLT/PRESS (+ SOUND from the phone), pressure in bar,
-- value null on a sensor fault, pass/warn/fail optional until thresholds are
-- agreed, and sensor-specific fields (TDS water temp, VOLT min/max) in `extra`.

alter table public.readings drop constraint readings_sensor_check;
update public.readings set sensor = case sensor
  when 'temperature' then 'TEMP' when 'tds' then 'TDS' when 'voltage' then 'VOLT'
  when 'pressure' then 'PRESS' when 'sound' then 'SOUND' else sensor end;
update public.readings set value = value * 10, unit = 'bar' where sensor = 'PRESS' and unit = 'MPa';
alter table public.readings
  add constraint readings_sensor_check check (sensor in ('TEMP', 'TDS', 'VOLT', 'PRESS', 'SOUND'));

alter table public.readings alter column value drop not null;
alter table public.readings
  add constraint readings_value_check check (value is not null or status = 'fault');
alter table public.readings alter column result drop not null;
alter table public.readings add column extra jsonb;

create or replace function public.submit_visit(p jsonb)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_id uuid := (p ->> 'id')::uuid;
begin
  insert into visits (id, technician_id, customer_name, customer_phone, customer_address,
                      latitude, longitude, location_label, notes, started_at)
  values (
    v_id,
    p ->> 'technician_id',
    p -> 'customer' ->> 'name',
    p -> 'customer' ->> 'phone',
    p -> 'customer' ->> 'address',
    (p -> 'location' ->> 'latitude')::double precision,
    (p -> 'location' ->> 'longitude')::double precision,
    p -> 'location' ->> 'label',
    p ->> 'notes',
    (p ->> 'started_at')::timestamptz
  )
  on conflict (id) do nothing;

  if not found then
    return jsonb_build_object('id', v_id, 'created', false);
  end if;

  insert into readings (visit_id, sensor, value, unit, result, status, battery_v,
                        device_id, firmware_version, taken_at, extra)
  select v_id, r.sensor, r.value, r.unit, r.result, r.status, r.battery_v,
         r.device_id, r.firmware_version, r.taken_at, r.extra
  from jsonb_to_recordset(p -> 'readings') as r (
    sensor text, value double precision, unit text, result text, status text,
    battery_v real, device_id text, firmware_version text, taken_at timestamptz, extra jsonb
  );

  return jsonb_build_object('id', v_id, 'created', true);
end;
$$;

revoke execute on function public.submit_visit(jsonb) from public, anon, authenticated;
grant execute on function public.submit_visit(jsonb) to service_role;
