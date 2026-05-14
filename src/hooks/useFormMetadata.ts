import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface FormFieldMeta {
  key:     string
  label:   string
  section: string
  type:    string
  unit:    string | null
  ref:     string | null
}

export interface FormMetadata {
  form_key:   string
  title:      string
  fields:     FormFieldMeta[]
  updated_at: string
}

export function useFormMetadata(
  formKey: string | null | undefined,
  formPath?: string | null,
) {
  return useQuery({
    queryKey: ['form_metadata', formKey, formPath],
    queryFn: async (): Promise<FormMetadata | null> => {
      if (!formKey) return null

      // 1. Try fetching the static .meta.json co-located with the HTML form
      if (formPath) {
        try {
          const basePath = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '')
          const metaUrl = `${window.location.origin}${basePath}${formPath.replace(/\.html?$/, '.meta.json')}`
          const res = await fetch(metaUrl)
          if (res.ok) {
            const json = await res.json()
            return json as FormMetadata
          }
        } catch {
          // fall through to Supabase
        }
      }

      // 2. Fallback: Supabase form_field_metadata table
      const { data, error } = await supabase
        .from('form_field_metadata')
        .select('*')
        .eq('form_key', formKey)
        .single()
      if (error) return null
      return data as FormMetadata
    },
    enabled: !!formKey,
    staleTime: 1000 * 60 * 60, // metadados raramente mudam — cache 1h
  })
}

/** Extrai o form_key a partir do form_url do plano (ex: "/forms/cubiculo-blindado-1kvcc.html" → "cubiculo-blindado-1kvcc") */
export function formKeyFromUrl(formUrl: string | null | undefined): string | null {
  if (!formUrl) return null
  const filename = formUrl.split('/').pop() ?? ''
  return filename.replace(/\.html?$/, '') || null
}
