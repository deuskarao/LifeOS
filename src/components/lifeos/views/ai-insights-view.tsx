'use client'

import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { api, ApiError } from '@/lib/api-client'
import { useNav } from '@/lib/nav-store'
import { PageHeader } from '../page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  Sparkles,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  Info,
  AlertOctagon,
  RefreshCw,
  Wand2,
  TrendingUp,
} from 'lucide-react'

type InsightType = 'success' | 'warning' | 'info' | 'danger'
type InsightCategory = 'budget' | 'debt' | 'savings' | 'investment' | 'spending'

interface Insight {
  type: InsightType
  title: string
  description: string
  category: InsightCategory
}

interface InsightsResponse {
  summary: string
  insights: Insight[]
  recommendations: string[]
}

interface QuotaResponse {
  level: string
  canUseAi: boolean
  usedToday: number
  limit: number
  remaining: number
  isPremium: boolean
}

const INSIGHT_STYLES: Record<
  InsightType,
  { bg: string; border: string; text: string; iconBg: string; icon: typeof CheckCircle2; label: string }
> = {
  success: {
    bg: 'bg-emerald-500/5',
    border: 'border-emerald-500/25',
    text: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-500/10',
    icon: CheckCircle2,
    label: 'Olumlu',
  },
  warning: {
    bg: 'bg-amber-500/5',
    border: 'border-amber-500/25',
    text: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-500/10',
    icon: AlertTriangle,
    label: 'Dikkat',
  },
  info: {
    bg: 'bg-sky-500/5',
    border: 'border-sky-500/25',
    text: 'text-sky-600 dark:text-sky-400',
    iconBg: 'bg-sky-500/10',
    icon: Info,
    label: 'Bilgi',
  },
  danger: {
    bg: 'bg-rose-500/5',
    border: 'border-rose-500/25',
    text: 'text-rose-600 dark:text-rose-400',
    iconBg: 'bg-rose-500/10',
    icon: AlertOctagon,
    label: 'Risk',
  },
}

const CATEGORY_LABELS: Record<InsightCategory, string> = {
  budget: 'Bütçe',
  debt: 'Borç',
  savings: 'Tasarruf',
  investment: 'Yatırım',
  spending: 'Harcama',
}

const SUGGESTED_QUESTIONS = [
  'Bu ayki harcamalarım nasıl optimize edilebilir?',
  'Kart borçlarımı nasıl daha hızlı kapatabilirim?',
  'Tasarruf oranımı nasıl artırabilirim?',
  'Yatırım portföyümü nasıl çeşitlendirmeliyim?',
]

export function AiInsightsView() {
  const [question, setQuestion] = useState('')
  const { data: session } = useSession()
  const role = (session?.user as any)?.role as 'admin' | 'demo' | 'user' | undefined
  const level = (session?.user as any)?.level as 'standard' | 'premium' | undefined
  const isDemoOrPremium = role === 'demo' || role === 'admin' || level === 'premium'

  // Quota bilgisi
  const quota = useQuery<QuotaResponse>({
    queryKey: ['ai-quota'],
    queryFn: () => api.get<QuotaResponse>('/api/lifeos/ai-quota'),
    refetchOnMount: true,
  })

  const mutation = useMutation<InsightsResponse, ApiError, string | undefined>({
    mutationFn: (q?: string) =>
      api.post<InsightsResponse>('/api/lifeos/ai-insights', { question: q || undefined }),
    onSuccess: () => {
      quota.refetch()
    },
    onError: (err) => {
      toast.error(err.message || 'AI analizi başarısız oldu. Lütfen tekrar deneyin.')
      quota.refetch()
    },
  })

  const handleAnalyze = () => {
    if (!isDemoOrPremium && quota.data && !quota.data.canUseAi) {
      toast.error("Günlük AI soru hakkınızı doldurdunuz. Premium'a yükselterek günde 5 hak kazanabilirsiniz.")
      return
    }
    mutation.mutate(question.trim() || undefined)
  }

  const data = mutation.data
  const isLoading = mutation.isPending
  const isError = mutation.isError

  // Standart kullanıcı ve hak bittiyse upgrade promptu göster
  const blocked = !isDemoOrPremium && quota.data && !quota.data.canUseAi

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Finansal Asistan"
        description="Yapay zeka destekli finansal sağlık analizi"
        icon={Sparkles}
      />

      {/* Hero card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="relative overflow-hidden border-none">
          <div className="gradient-emerald absolute inset-0 opacity-90" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,oklch(1/0.18),transparent_55%)]" />
          <CardContent className="relative z-10 p-6 md:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl text-white">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">
                  <Sparkles className="h-3.5 w-3.5" />
                  Yapay Zeka Destekli Analiz
                </div>
                <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                  Finansal sağlığınızı saniyeler içinde analiz edin
                </h2>
                <p className="mt-2 text-sm text-white/85 md:text-base">
                  Finansal verilerinizi analiz ederek kişiselleştirilmiş öneriler sunar. Net değer, borç
                  oranı, tasarruf alışkanlıklarınız ve harcama eğilimleriniz değerlendirilir; somut ve
                  uygulanabilir aksiyon önerileri alırsınız.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                  {['Bütçe Analizi', 'Borç Optimizasyonu', 'Yatırım Önerileri', 'Risk Tespiti'].map((t) => (
                    <span
                      key={t}
                      className="rounded-md bg-white/15 px-2 py-1 font-medium text-white/90 backdrop-blur-sm"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div className="hidden lg:block">
                <div className="relative flex h-32 w-32 items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-white/15 blur-2xl" />
                  <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-white/20 backdrop-blur-md">
                    <Wand2 className="h-11 w-11 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Question input + CTA */}
      <Card>
        <CardContent className="space-y-4 p-5 md:p-6">
          {/* Quota / upgrade banner */}
          {blocked ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-500">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Günlük AI hakkınız doldu</p>
                  <p className="text-xs text-muted-foreground">
                    Standart üyelikte günde 1 hak. Premium'a yükselerek günde 5 hak kazanabilirsiniz.
                  </p>
                </div>
              </div>
              <Button size="sm" onClick={() => set('settings')} className="shrink-0">
                Premium'a Yükselt
              </Button>
            </div>
          ) : quota.data && !isDemoOrPremium ? (
            <div className="flex items-center justify-between rounded-lg bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">
                <Sparkles className="inline h-3 w-3 mr-1" />
                Günlük hak: <span className="font-semibold text-foreground">{quota.data.remaining}/{quota.data.limit}</span> kaldı
              </p>
              <button
                onClick={() => set('settings')}
                className="text-xs font-medium text-primary hover:underline"
              >
                Premium'a yükselt →
              </button>
            </div>
          ) : isDemoOrPremium && quota.data ? (
            <div className="flex items-center justify-between rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3">
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  {role === 'demo' ? 'Demo Modu' : 'Premium'}
                </Badge>
                <p className="text-xs text-muted-foreground">
                  {`Günlük hak: ${quota.data.remaining}/${quota.data.limit} kaldı`}
                </p>
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <label htmlFor="ai-question" className="text-sm font-medium">
              Soru Sor (Opsiyonel)
            </label>
            <Textarea
              id="ai-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Örn: Bu ayki harcamalarım nasıl optimize edilebilir?"
              className="min-h-24 resize-none"
              disabled={isLoading}
            />
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuestion(q)}
                  disabled={isLoading}
                  className="rounded-full border bg-muted/40 px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Analiz tüm finansal verilerinizi (banka, kart, kredi, varlık, gelir, gider) baz alır.
            </p>
            <Button
              size="lg"
              onClick={handleAnalyze}
              disabled={isLoading || blocked}
              className="gap-2 sm:w-auto"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Analiz Ediliyor…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Analiz Et
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* States */}
      {isLoading && <LoadingState />}

      {isError && !isLoading && (
        <ErrorState onRetry={() => mutation.mutate(question.trim() || undefined)} />
      )}

      {data && !isLoading && !isError && <Results data={data} />}
    </div>
  )
}

/* -------------------------- Loading -------------------------- */

function LoadingState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <Card className="border-primary/20 bg-primary/[0.03]">
        <CardContent className="flex flex-col items-center justify-center gap-4 py-12 text-center">
          <div className="relative flex h-14 w-14 items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-6 w-6 animate-pulse" />
            </div>
          </div>
          <div>
            <p className="font-semibold">Yapay zeka verilerinizi analiz ediyor…</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Banka, kart, kredi, varlık ve gelir-gider verileriniz değerlendiriliyor. Bu işlem birkaç saniye sürebilir.
            </p>
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-primary"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Skeleton className="h-28" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-40" />
      </div>
    </motion.div>
  )
}

/* -------------------------- Error -------------------------- */

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-rose-500/30 bg-rose-500/[0.04]">
        <CardContent className="flex flex-col items-center justify-center gap-4 py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
            <AlertOctagon className="h-7 w-7" />
          </div>
          <div>
            <p className="font-semibold">Analiz tamamlanamadı</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Yapay zeka servisine ulaşılamadı veya yanıt alınamadı. Lütfen biraz bekleyip tekrar deneyin.
            </p>
          </div>
          <Button variant="outline" onClick={onRetry} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Tekrar Dene
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}

/* -------------------------- Results -------------------------- */

function Results({ data }: { data: InsightsResponse }) {
  const { summary, insights = [], recommendations = [] } = data

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Summary */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="relative overflow-hidden border-primary/20">
          <div className="absolute inset-y-0 left-0 w-1.5 bg-primary" />
          <CardContent className="p-5 md:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Genel Değerlendirme
                  </h3>
                  <Badge variant="secondary" className="text-[10px]">AI Özeti</Badge>
                </div>
                <p className="text-base font-medium leading-relaxed md:text-lg">{summary}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Insights grid */}
      {insights.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">İçgörüler</h3>
            <Badge variant="outline" className="text-xs">{insights.length} bulgu</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {insights.map((ins, i) => {
              const s = INSIGHT_STYLES[ins.type] || INSIGHT_STYLES.info
              const Icon = s.icon
              return (
                <motion.div
                  key={`${ins.title}-${i}`}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: i * 0.08 }}
                >
                  <Card className={`h-full overflow-hidden ${s.border} ${s.bg}`}>
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${s.iconBg} ${s.text}`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-semibold leading-tight">{ins.title}</h4>
                            <Badge
                              variant="outline"
                              className={`ml-auto ${s.text} border-current/20`}
                            >
                              {s.label}
                            </Badge>
                          </div>
                          <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                            {ins.description}
                          </p>
                          <Badge variant="secondary" className="mt-3 text-[10px]">
                            {CATEGORY_LABELS[ins.category] || ins.category}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <Card>
            <CardContent className="p-5 md:p-6">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                  <Lightbulb className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">Öneriler</h3>
                  <p className="text-xs text-muted-foreground">
                    Finansal sağlığınızı iyileştirmek için {recommendations.length} aksiyon önerisi
                  </p>
                </div>
              </div>
              <ol className="space-y-3">
                {recommendations.map((rec, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 + i * 0.07 }}
                    className="flex items-start gap-3 rounded-lg border bg-card/50 p-3"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {i + 1}
                    </div>
                    <p className="text-sm leading-relaxed pt-0.5">{rec}</p>
                  </motion.li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Empty (no insights / no recs) */}
      {insights.length === 0 && recommendations.length === 0 && !summary && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <TrendingUp className="h-6 w-6" />
            </div>
            <p className="font-medium">Bu analiz için içerik bulunamadı</p>
            <p className="text-sm text-muted-foreground">Lütfen farklı bir soru ile tekrar deneyin.</p>
          </CardContent>
        </Card>
      )}
    </motion.div>
  )
}
