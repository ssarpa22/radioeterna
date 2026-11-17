import { Search } from 'lucide-react';
import type { Category, Country } from '@/types';

/** Plain GET form: works without JavaScript and keeps filtered URLs shareable. */
export function SearchForm({ countries, categories, values = {}, compact = false }: { countries: Country[]; categories: Category[]; values?: { q?: string; pais?: string; categoria?: string }; compact?: boolean }) {
  return (
    <form action="/radios" method="get" role="search" aria-label="Buscar radios" className={`grid gap-3 ${compact ? 'md:grid-cols-[1.6fr_1fr_1fr_auto]' : 'sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_auto]'}`}>
      <div><label htmlFor="q" className="label">Nombre de la radio</label>
        <input id="q" name="q" type="search" defaultValue={values.q} placeholder="Ej.: alabanza" maxLength={80} className="field" /></div>
      <div><label htmlFor="pais" className="label">País</label>
        <select id="pais" name="pais" defaultValue={values.pais ?? ''} className="field"><option value="">Todos los países</option>
          {countries.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}</select></div>
      <div><label htmlFor="categoria" className="label">Categoría</label>
        <select id="categoria" name="categoria" defaultValue={values.categoria ?? ''} className="field"><option value="">Todas las categorías</option>
          {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}</select></div>
      <div className="flex items-end"><button type="submit" className="btn btn-dark w-full"><Search className="h-4 w-4" aria-hidden />Buscar</button></div>
    </form>
  );
}
