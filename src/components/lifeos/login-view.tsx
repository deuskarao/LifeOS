'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Wallet, Mail, Lock, Loader2, Sparkles, User, Chrome, ArrowRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

export function LoginView() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (mode === 'register') {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })
      const data = await res.json()
      if (!data.ok) {
        setError(data.error || 'Kayıt başarısız')
        setLoading(false)
        return
      }
      // Auto-login after register
      const signInRes = await signIn('credentials', { email, password, redirect: false })
      if (signInRes?.error) {
        setError('Kayıt başarılı ama giriş yapılamadı. Lütfen giriş yapın.')
        setMode('login')
        setLoading(false)
        return
      }
      router.refresh()
      return
    }

    const res = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)
    if (res?.error) {
      setError('Email veya şifre hatalı')
    } else {
      router.refresh()
    }
  }

  async function demoLogin() {
    setLoading(true)
    setError('')
    const res = await signIn('credentials', {
      email: 'demo@lifeos.app',
      password: 'demo123',
      redirect: false,
    })
    setLoading(false)
    if (res?.error) {
      toast.error('Demo girişi başarısız')
    } else {
      router.refresh()
    }
  }

  async function googleLogin() {
    // Google OAuth yapılandırılmadıysa bilgilendirici mesaj
    const res = await signIn('google', { redirect: false }).catch(() => null)
    if (res?.error) {
      toast.info('Google ile giriş henüz yapılandırılmadı', {
        description: 'Demo hesabı ile deneyebilir veya email/şifre ile giriş yapabilirsiniz.',
      })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
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
        <button
          onClick={() => router.refresh()}
          className="flex flex-col items-center mb-8 w-full"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-emerald text-white shadow-lg shadow-emerald-500/20 mb-4">
            <Wallet className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">LifeOS</h1>
          <p className="mt-1 text-sm text-muted-foreground">Yaşam Yönetim Platformu</p>
        </button>

        <Card className="border-border/60 shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">
              {mode === 'login' ? 'Giriş Yap' : 'Hesap Oluştur'}
            </CardTitle>
            <CardDescription>
              {mode === 'login'
                ? 'Finansal yaşamınızı yönetmeye devam edin'
                : 'LifeOS ailesine katılın — ücretsiz başlayın'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* OAuth buttons */}
            <div className="space-y-2 mb-4">
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={googleLogin}
                disabled={loading}
              >
                <Chrome className="h-4 w-4" />
                Google ile giriş yap
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2 border-violet-500/30 hover:bg-violet-500/5"
                onClick={demoLogin}
                disabled={loading}
              >
                <Sparkles className="h-4 w-4 text-violet-500" />
                Demo hesabı ile giriş yap
              </Button>
            </div>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">veya</span>
              </div>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <AnimatePresence mode="wait">
                {mode === 'register' && (
                  <motion.div
                    key="name-field"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 overflow-hidden"
                  >
                    <Label htmlFor="name">Ad Soyad</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="name"
                        placeholder="Ahmet Yılmaz"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="pl-9"
                        required
                        autoComplete="name"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

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
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
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

              <Button type="submit" className="w-full gap-2" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {mode === 'login' ? 'Giriş yapılıyor…' : 'Hesap oluşturuluyor…'}
                  </>
                ) : (
                  <>
                    {mode === 'login' ? 'Giriş Yap' : 'Hesap Oluştur'}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              {mode === 'login' ? (
                <>
                  Hesabınız yok mu?{' '}
                  <button
                    onClick={() => { setMode('register'); setError('') }}
                    className="font-medium text-primary hover:underline"
                  >
                    Kayıt Ol
                  </button>
                </>
              ) : (
                <>
                  Zaten hesabınız var mı?{' '}
                  <button
                    onClick={() => { setMode('login'); setError('') }}
                    className="font-medium text-primary hover:underline"
                  >
                    Giriş Yap
                  </button>
                </>
              )}
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
