
'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { portsAndAirports } from '@/lib/ports';

interface AutocompleteInputProps {
    field: any;
    placeholder: string;
    modal: 'ocean' | 'air' | 'courier' | 'road';
}

export const AutocompleteInput = ({ field, placeholder, modal }: AutocompleteInputProps) => {
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);

    const suggestions = useMemo(() => {
        if (modal === 'road') {
            // Placeholder for city/road suggestions
            return ['São Paulo, BR', 'Rio de Janeiro, BR', 'Buenos Aires, AR', 'Santiago, CL'];
        }
        const relevantPortType = modal === 'ocean' ? 'port' : 'airport';
        return portsAndAirports
            .filter(p => p.type === relevantPortType)
            .map(p => `${p.name}, ${p.country}`);
    }, [modal]);

    const filterSuggestions = (value: string) => {
        const currentPart = value.split(',').pop()?.trim().toLowerCase() ?? '';
        if (currentPart.length >= 2) {
            setFilteredSuggestions(suggestions.filter(s =>
                s.toLowerCase().includes(currentPart)
            ));
        } else {
            setFilteredSuggestions([]);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        field.onChange(value);
        if (!showSuggestions) setShowSuggestions(true);
        filterSuggestions(value);
    };

    const handleSelectSuggestion = (suggestion: string) => {
        field.onChange(suggestion);
        setShowSuggestions(false);
    };
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const currentInputPart = field.value?.split(',').pop()?.trim() ?? '';

    return (
        <div ref={containerRef} className="relative">
            <Input
                placeholder={placeholder}
                {...field}
                onChange={handleInputChange}
                onFocus={() => {
                    filterSuggestions(field.value || '');
                    setShowSuggestions(true);
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Escape') setShowSuggestions(false);
                }}
                autoComplete="off"
            />
            {showSuggestions && (
                <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto p-1">
                    {filteredSuggestions.length > 0 ? (
                        filteredSuggestions.map((suggestion, index) => (
                            <div
                                key={`${suggestion}-${index}`}
                                onMouseDown={(e) => { e.preventDefault(); handleSelectSuggestion(suggestion); }}
                                className="cursor-pointer rounded-sm px-3 py-2 text-sm hover:bg-accent"
                            >
                                {suggestion}
                            </div>
                        ))
                    ) : (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                            {currentInputPart.length >= 2 ? 'Nenhum local encontrado.' : 'Digite 2+ letras para buscar...'}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
