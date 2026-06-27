'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Wallet, Mail, Lock, Loader2, Sparkles, ShieldCheck, User } from 'lucide-react'
import { motion } from 'framer-motion'

export function LoginView() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)
    if (res?.error) {
      setError('Email veya şifre hatalı')
    } else {
      router.refresh()
    }
  }

  function quickLogin(type: 'admin' | 'demo' | 'user') {
    const creds = {
      admin: { email: 'admin@lifeos.app', password: 'admin123' },
      demo: { email: 'demo@lifeos.app', password: 'demo123' },
      user: { email: 'ahmet@lifeos.app', password: 'user123' },
    }[type]
    setEmail(creds.email)
    setPassword(creds.password)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-emerald text-white shadow-lg shadow-emerald-500/20 mb-4">
            <Wallet className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">LifeOS</h1>
          <p className="mt-1 text-sm text-muted-foreground">Yaşam Yönetim Platformu</p>
        </div>

        <Card className="border-border/60 shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Giriş Yap</CardTitle>
            <CardDescription>Finansal yaşamınızı yönetmeye devam edin</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="ornek@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Şifre</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9"
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2"
                >
                  {error}
                </motion.p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Giriş yapılıyor…
                  </>
                ) : (
                  'Giriş Yap'
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t">
              <p className="text-xs text-center text-muted-foreground mb-3">Hızlı giriş (demo amaçlı)</p>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex flex-col items-center gap-1 h-auto py-2"
                  onClick={() => quickLogin('admin')}
                >
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <span className="text-[11px]">Admin</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex flex-col items-center gap-1 h-auto py-2"
                  onClick={() => quickLogin('demo')}
                >
                  <Sparkles className="h-4 w-4 text-violet-500" />
                  <span className="text-[11px]">Demo</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex flex-col items-center gap-1 h-auto py-2"
                  onClick={() => quickLogin('user')}
                >
                  <User className="h-4 w-4 text-sky-500" />
                  <span className="text-[11px]">User</span>
                </Button>
              </div>
              <p className="mt-3 text-[11px] text-center text-muted-foreground">
                Admin: DB verisi • Demo: memory (geçici) • User: kendi verisi
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} LifeOS — Supabase ile güçlendirilmiştir
        </p>
      </motion.div>
    </div>
  )
}
