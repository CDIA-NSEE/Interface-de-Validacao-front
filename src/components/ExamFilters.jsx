import { Search, SlidersHorizontal } from "lucide-react";
import { useState } from "react";

import AdvancedFilters from "./AdvancedFilters.jsx";

export default function ExamFilters({
  filters,
  onChange,
  categoryOptions = [],
  examTypeOptions = [],
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  function updateFilter(event) {
    const { name, value } = event.target;
    onChange({ ...filters, [name]: value });
  }

  return (
    <section className="filters-panel" aria-label="Filtros de exames">
      <label className="search-field">
        Busca
        <div className="input-with-icon">
          <Search size={18} aria-hidden="true" />
          <input
            name="search"
            type="search"
            value={filters.search}
            onChange={updateFilter}
            placeholder="ID, código ou paciente"
          />
        </div>
      </label>

      <label>
        Categoria
        <select name="category" value={filters.category} onChange={updateFilter}>
          <option value="">Todas</option>
          {categoryOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label>
        Tipo
        <select name="exam_type" value={filters.exam_type} onChange={updateFilter}>
          <option value="">Todos</option>
          {examTypeOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <button
        className="button secondary advanced-toggle"
        type="button"
        onClick={() => setAdvancedOpen((current) => !current)}
        aria-expanded={advancedOpen}
        aria-controls="advanced-filters"
      >
        <SlidersHorizontal size={17} aria-hidden="true" />
        Filtros avançados
      </button>

      {advancedOpen ? <AdvancedFilters filters={filters} onChange={onChange} /> : null}
    </section>
  );
}
