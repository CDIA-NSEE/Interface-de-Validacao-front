import { Search } from "lucide-react";

export default function ExamFilters({ filters, onChange }) {
  function updateFilter(event) {
    const { name, value } = event.target;
    onChange({ ...filters, [name]: value });
  }

  return (
    <section className="filters-panel" aria-label="Filtros de exames">
      <label className="search-field">
        Buscar exame
        <div className="input-with-icon">
          <Search size={18} aria-hidden="true" />
          <input
            name="search"
            type="search"
            value={filters.search}
            onChange={updateFilter}
            placeholder="ID ou código do exame"
          />
        </div>
      </label>
    </section>
  );
}
