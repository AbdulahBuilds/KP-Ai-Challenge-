'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react';
import { api, queryString } from '@/lib/api';
import type { IncidentSummary, Paginated } from '@/lib/types';
import { Badge, EmptyState, ErrorBox, Loading, PageHeader } from '@/components/ui';
import { PERMISSIONS } from '@/lib/constants';
import { formatDate, hasPermission, titleCase } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';

export default function IncidentsPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const query = useQuery({
    queryKey: ['incidents', page, search],
    queryFn: () => api<Paginated<IncidentSummary>>(`/incidents${queryString({ page, pageSize: 15, search })}`),
  });

  const data = query.data;

  return (
    <div>
      <PageHeader
        eyebrow="Rescue emergency cases"
        title="Emergency cases"
        description="Create cases, find suitable hospitals, review recommendations, select destination, and send pre-arrival alerts."
        actions={
          hasPermission(user, PERMISSIONS.INCIDENT_CREATE) ? (
            <Link href="/incidents/new" className="btn-primary">
              <Plus className="h-4 w-4" /> New emergency
            </Link>
          ) : null
        }
      />

      <form
        className="card-surface mb-5 flex flex-col gap-3 p-4 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          query.refetch();
        }}
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <input
            className="input-base pl-9"
            placeholder="Search by case number, title, location, patient, or symptoms"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button type="submit" className="btn-secondary">Search</button>
      </form>

      {query.isLoading ? <Loading label="Loading emergency cases…" /> : null}
      {query.error ? <ErrorBox message={(query.error as Error).message} onRetry={() => query.refetch()} /> : null}

      {data ? (
        <div className="card-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-base min-w-[860px]">
              <thead>
                <tr>
                  <th>Case</th>
                  <th>Emergency</th>
                  <th>Location</th>
                  <th>Destination</th>
                  <th>Received</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((incident) => (
                  <tr key={incident.id}>
                    <td>
                      <Link href={`/incidents/${incident.id}`} className="font-mono text-xs font-bold text-primary hover:underline">
                        {incident.caseNumber}
                      </Link>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {incident.patient?.patientName || 'Patient not identified'}
                        {incident.patient?.age != null ? ` · ${incident.patient.age}y` : ''}
                      </p>
                    </td>
                    <td>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge value={incident.severity} />
                        <span className="text-[11px] font-medium text-muted-foreground">{titleCase(incident.emergencyType)}</span>
                      </div>
                      <Link href={`/incidents/${incident.id}`} className="mt-1 block max-w-sm truncate text-sm font-semibold text-slate-800 hover:text-primary">
                        {incident.title}
                      </Link>
                      {incident.patient?.suspectedCondition ? (
                        <p className="max-w-sm truncate text-xs text-muted-foreground">{incident.patient.suspectedCondition}</p>
                      ) : null}
                    </td>
                    <td className="max-w-[220px] text-xs text-muted-foreground">
                      <p className="truncate">{incident.address ?? 'No address provided'}</p>
                      <p className="font-mono text-[10px] text-slate-400">{incident.latitude.toFixed(5)}, {incident.longitude.toFixed(5)}</p>
                    </td>
                    <td className="max-w-[180px] text-xs">
                      {incident.destinationHospitalName ? (
                        <span className="font-medium text-slate-700">{incident.destinationHospitalName}</span>
                      ) : (
                        <span className="text-amber-700">Not selected</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(incident.receivedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.data.length === 0 ? (
            <EmptyState
              title={search ? 'No cases match this search' : 'No emergency cases yet'}
              description={search ? 'Try a different search term.' : 'Create a new emergency case to start the workflow.'}
              action={
                !search && hasPermission(user, PERMISSIONS.INCIDENT_CREATE) ? (
                  <Link href="/incidents/new" className="btn-primary"><Plus className="h-4 w-4" /> New emergency</Link>
                ) : null
              }
            />
          ) : null}
          <div className="flex flex-col items-center justify-between gap-3 border-t px-4 py-3 text-xs text-muted-foreground sm:flex-row">
            <span>{data.meta.total} case{data.meta.total === 1 ? '' : 's'} · page {data.meta.page} of {Math.max(1, data.meta.totalPages)}</span>
            <div className="flex items-center gap-2">
              <button type="button" className="btn-secondary h-8 px-3" disabled={!data.meta.hasPrevious} onClick={() => setPage((v) => v - 1)}>
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </button>
              <button type="button" className="btn-secondary h-8 px-3" disabled={!data.meta.hasNext} onClick={() => setPage((v) => v + 1)}>
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
