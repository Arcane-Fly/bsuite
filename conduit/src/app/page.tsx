import ConduitLanding from '@/components/marketing/ConduitLanding'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/candidates')
  }

  return <ConduitLanding />
}
