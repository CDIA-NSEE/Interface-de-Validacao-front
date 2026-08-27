import { Search } from "lucide-react";

import { Field, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

export default function ExamFilters({ filters, onChange }) {
  function updateFilter(event) {
    const { name, value } = event.target;
    onChange({ ...filters, [name]: value });
  }

  return (
    <section className="w-full" aria-label="Filtros de exames">
      <Field>
        <FieldLabel htmlFor="exam-search">Buscar exame</FieldLabel>
        <InputGroup>
          <InputGroupInput
            id="exam-search"
            name="search"
            type="search"
            value={filters.search}
            onChange={updateFilter}
            placeholder="ID ou código do exame"
          />
          <InputGroupAddon align="inline-start">
            <Search aria-hidden="true" />
          </InputGroupAddon>
        </InputGroup>
      </Field>
    </section>
  );
}
