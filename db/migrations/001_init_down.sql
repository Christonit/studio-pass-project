-- StudioPass — undo migration 001. DELETES ALL STUDIOPASS TABLES AND THEIR DATA.
begin;

alter table if exists proposals drop constraint if exists proposals_class_id_fkey;

drop table if exists credit_transactions;
drop table if exists bookings;
drop table if exists sessions;
drop table if exists classes;
drop table if exists proposals;
drop table if exists credit_packages;
drop table if exists locations;
drop table if exists users;

commit;
