import { Check, ChevronDown, Plus, X } from "lucide-react";
import { useId, useMemo, useState } from "react";

export interface SelectOption { id: string; name: string }

interface BaseProps {
  options: SelectOption[];
  placeholder: string;
  createLabel: (name: string) => string;
  onCreate: (name: string) => Promise<SelectOption>;
  canCreate?: boolean;
  disabled?: boolean;
}

export function CreatableSelect({ options, value, onChange, emptyLabel, ...props }: BaseProps & {
  value: SelectOption | null;
  onChange: (value: SelectOption | null) => void;
  emptyLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const listId = useId();
  const filtered = useFilteredOptions(options, query);
  const canCreate = props.canCreate !== false && canCreateOption(options, query);

  async function create() {
    setCreating(true);
    try {
      onChange(await props.onCreate(query.trim()));
      setQuery("");
      setOpen(false);
    } finally { setCreating(false); }
  }

  return (
    <div className="combobox">
      <button className="combobox-trigger" type="button" aria-expanded={open} aria-controls={listId} onClick={() => setOpen(!open)} disabled={props.disabled}>
        <span>{value?.name ?? emptyLabel}</span><ChevronDown aria-hidden="true" size={17} />
      </button>
      {open ? (
        <div className="combobox-popover" id={listId}>
          <input aria-label={props.placeholder} placeholder={props.placeholder} value={query} onChange={(event) => setQuery(event.target.value)} autoFocus />
          <div className="combobox-options">
            <button type="button" className="combobox-option" onClick={() => { onChange(null); setOpen(false); }}><span>{emptyLabel}</span>{value === null ? <Check size={16} /> : null}</button>
            {filtered.map((option) => <button type="button" className="combobox-option" key={option.id} onClick={() => { onChange(option); setOpen(false); setQuery(""); }}><span>{option.name}</span>{value?.id === option.id ? <Check size={16} /> : null}</button>)}
            {canCreate ? <button type="button" className="combobox-option create-option" disabled={creating} onClick={() => void create()}><Plus size={16} /><span>{props.createLabel(query.trim())}</span></button> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function CreatableMultiSelect({ options, values, onChange, selectedLabel, max = 10, ...props }: BaseProps & {
  values: SelectOption[];
  onChange: (values: SelectOption[]) => void;
  selectedLabel: string;
  max?: number;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const listId = useId();
  const filtered = useFilteredOptions(options, query).filter((option) => !values.some((value) => value.id === option.id));
  const canCreate = props.canCreate !== false && values.length < max && canCreateOption(options, query);

  async function create() {
    setCreating(true);
    try {
      const option = await props.onCreate(query.trim());
      onChange([...values, option]);
      setQuery("");
    } finally { setCreating(false); }
  }

  return (
    <div className="combobox">
      {values.length > 0 ? <div className="selected-options" aria-label={selectedLabel}>{values.map((value) => <span key={value.id}>{value.name}<button type="button" aria-label={`${value.name} ${selectedLabel}`} onClick={() => onChange(values.filter((item) => item.id !== value.id))}><X size={14} /></button></span>)}</div> : null}
      <button className="combobox-trigger" type="button" aria-expanded={open} aria-controls={listId} onClick={() => setOpen(!open)} disabled={props.disabled || values.length >= max}>
        <span>{props.placeholder}</span><ChevronDown aria-hidden="true" size={17} />
      </button>
      {open ? <div className="combobox-popover" id={listId}>
        <input aria-label={props.placeholder} placeholder={props.placeholder} value={query} onChange={(event) => setQuery(event.target.value)} autoFocus />
        <div className="combobox-options">
          {filtered.map((option) => <button type="button" className="combobox-option" key={option.id} onClick={() => { onChange([...values, option]); setQuery(""); }}><span>{option.name}</span></button>)}
          {canCreate ? <button type="button" className="combobox-option create-option" disabled={creating} onClick={() => void create()}><Plus size={16} /><span>{props.createLabel(query.trim())}</span></button> : null}
        </div>
      </div> : null}
    </div>
  );
}

function useFilteredOptions(options: SelectOption[], query: string) {
  return useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return normalized ? options.filter((option) => option.name.toLocaleLowerCase().includes(normalized)) : options;
  }, [options, query]);
}

function canCreateOption(options: SelectOption[], query: string) {
  const normalized = query.trim().toLocaleLowerCase();
  return normalized.length > 0 && !options.some((option) => option.name.toLocaleLowerCase() === normalized);
}
