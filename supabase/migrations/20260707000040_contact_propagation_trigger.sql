-- Contact Propagation Doctrine (ADR-0006)
-- Implements automatic propagation of contact changes across role junctions
-- When a contact's email/phone/name changes, all role references update automatically

-- Ensure current_tenant_id() function exists (AUTH_CANONICAL.md §3.4)
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid;
$$;

-- Trigger function: propagate contact changes to all role junctions
CREATE OR REPLACE FUNCTION public.fn_propagate_contact_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only propagate if key fields changed
  IF OLD.email IS DISTINCT FROM NEW.email
     OR OLD.phone IS DISTINCT FROM NEW.phone
     OR OLD.first_name IS DISTINCT FROM NEW.first_name
     OR OLD.last_name IS DISTINCT FROM NEW.last_name THEN

    -- Update apprentices (if contact is an apprentice)
    UPDATE apprentices
    SET email = NEW.email,
        phone = NEW.phone,
        first_name = NEW.first_name,
        last_name = NEW.last_name,
        updated_at = now()
    WHERE contact_id = NEW.id
      AND (email IS DISTINCT FROM NEW.email
           OR phone IS DISTINCT FROM NEW.phone
           OR first_name IS DISTINCT FROM NEW.first_name
           OR last_name IS DISTINCT FROM NEW.last_name);

    -- Update supervisors (if contact is a supervisor)
    UPDATE supervisors
    SET email = NEW.email,
        phone = NEW.phone,
        first_name = NEW.first_name,
        last_name = NEW.last_name,
        updated_at = now()
    WHERE contact_id = NEW.id
      AND (email IS DISTINCT FROM NEW.email
           OR phone IS DISTINCT FROM NEW.phone
           OR first_name IS DISTINCT FROM NEW.first_name
           OR last_name IS DISTINCT FROM NEW.last_name);

    -- Update client_contacts (if contact is a client contact)
    UPDATE client_contacts
    SET email = NEW.email,
        phone = NEW.phone,
        first_name = NEW.first_name,
        last_name = NEW.last_name,
        updated_at = now()
    WHERE contact_id = NEW.id
      AND (email IS DISTINCT FROM NEW.email
           OR phone IS DISTINCT FROM NEW.phone
           OR first_name IS DISTINCT FROM NEW.first_name
           OR last_name IS DISTINCT FROM NEW.last_name);

    -- Update placements (supervisor contact references)
    UPDATE placements
    SET supervisor_email = NEW.email,
        supervisor_phone = NEW.phone,
        supervisor_name = NEW.first_name || ' ' || NEW.last_name,
        updated_at = now()
    WHERE supervisor_contact_id = NEW.id
      AND (supervisor_email IS DISTINCT FROM NEW.email
           OR supervisor_phone IS DISTINCT FROM NEW.phone
           OR supervisor_name IS DISTINCT FROM (NEW.first_name || ' ' || NEW.last_name));

  END IF;

  RETURN NEW;
END $$;

-- Create trigger on contacts table
DROP TRIGGER IF EXISTS trg_propagate_contact_changes ON contacts;
CREATE TRIGGER trg_propagate_contact_changes
  AFTER UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION fn_propagate_contact_changes();

-- Ensure supervisors table exists (if not already created)
CREATE TABLE IF NOT EXISTS public.supervisors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  email text,
  phone text,
  first_name text,
  last_name text,
  is_active bool NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, contact_id)
);
ALTER TABLE public.supervisors ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public.supervisors FOR ALL
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

-- Ensure client_contacts table exists (if not already created)
CREATE TABLE IF NOT EXISTS public.client_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  email text,
  phone text,
  first_name text,
  last_name text,
  role text,
  is_primary bool NOT NULL DEFAULT false,
  is_active bool NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, contact_id)
);
ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public.client_contacts FOR ALL
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

-- Ensure placements has supervisor_contact_id column
ALTER TABLE public.placements
  ADD COLUMN IF NOT EXISTS supervisor_contact_id uuid REFERENCES supervisors(id);
