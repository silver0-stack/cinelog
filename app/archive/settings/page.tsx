import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SettingsShell } from '@/components/archive/SettingsShell'

export default async function ArchiveSettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <SettingsShell email={user.email ?? ''} />
}
