
'use client'

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const tabs = [
  { id: 'timeline', label: 'Timeline', content: 'Conteúdo da Timeline' },
  { id: 'details', label: 'Detalhes', content: 'Conteúdo dos Detalhes' },
  { id: 'documents', label: 'Documentos', content: 'Conteúdo dos Documentos' },
];

export default function TailwindTabsDemo() {
  const [activeTab, setActiveTab] = useState('timeline');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Teste de Abas Manuais (Tailwind CSS)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full max-w-4xl mx-auto p-6">
          <div className="flex border-b border-gray-200 mb-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === tab.id
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-muted-foreground hover:text-primary'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-4 border rounded bg-secondary/50 min-h-[100px]">
            {tabs.map((tab) =>
              activeTab === tab.id ? (
                <div key={tab.id}>
                  <p className="text-foreground font-semibold">{tab.content}</p>
                </div>
              ) : null
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
