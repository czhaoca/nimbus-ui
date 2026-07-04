"use client";

import { useState, useEffect, useCallback } from "react";
import { AlertCircle, CheckCircle2, ChevronDown, ChevronRight, GitBranch } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import {
  listWorkflows,
  createWorkflow,
  deleteWorkflow,
  runWorkflow,
  listWorkflowRuns,
} from "@/lib/api/workflows";
import type { WorkflowSummary, WorkflowRunSummary } from "@/lib/api/workflows";
import { ConfirmModal } from "@/components/ConfirmModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

/* ---------- StatusBadge ---------- */

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "success"
      ? "default"
      : status === "failed"
        ? "destructive"
        : "secondary";

  const className =
    status === "success"
      ? "bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30"
      : status === "failed"
        ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
        : status === "running"
          ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
          : "bg-muted text-muted-foreground";

  return (
    <Badge variant={variant} className={className}>
      {status}
    </Badge>
  );
}

/* ---------- WorkflowRuns sub-component ---------- */

function WorkflowRuns({ workflowId }: { workflowId: string }) {
  const [runs, setRuns] = useState<WorkflowRunSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listWorkflowRuns(workflowId)
      .then((data) => {
        if (!cancelled) setRuns(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [workflowId]);

  if (loading) {
    return (
      <div className="space-y-2 pt-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (runs.length === 0) {
    return <p className="text-sm text-muted-foreground pt-2">No runs yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Run ID</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Trigger</TableHead>
          <TableHead>Started</TableHead>
          <TableHead>Completed</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {runs.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="font-mono text-xs">
              {r.id.slice(0, 8)}
            </TableCell>
            <TableCell>
              <StatusBadge status={r.status} />
            </TableCell>
            <TableCell>{r.trigger}</TableCell>
            <TableCell>
              {r.started_at ? new Date(r.started_at).toLocaleString() : "\u2014"}
            </TableCell>
            <TableCell>
              {r.completed_at ? new Date(r.completed_at).toLocaleString() : "\u2014"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/* ---------- Main Page ---------- */

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* create form */
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [yaml, setYaml] = useState("");
  const [creating, setCreating] = useState(false);

  /* run */
  const [dryRun, setDryRun] = useState(false);
  const [runResult, setRunResult] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  /* delete */
  const [deleteTarget, setDeleteTarget] = useState<WorkflowSummary | null>(null);

  const fetchWorkflows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listWorkflows();
      setWorkflows(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load workflows");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const handleCreate = async () => {
    if (!name.trim() || !yaml.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await createWorkflow({ name: name.trim(), description: description.trim(), yaml_definition: yaml });
      setName("");
      setDescription("");
      setYaml("");
      await fetchWorkflows();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create workflow");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteWorkflow(deleteTarget.id);
      setDeleteTarget(null);
      await fetchWorkflows();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete workflow");
    }
  };

  const handleRun = async (id: string) => {
    setRunResult(null);
    try {
      const result = await runWorkflow(id, {}, dryRun);
      setRunResult(`Run ${result.id.slice(0, 8)} — ${result.status}`);
      if (expandedId === id) {
        /* refresh runs list by toggling */
        setExpandedId(null);
        setTimeout(() => setExpandedId(id), 50);
      }
    } catch (err) {
      setRunResult(err instanceof Error ? err.message : "Run failed");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Workflows" />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {runResult && (
        <Alert>
          <CheckCircle2 className="size-4" />
          <AlertDescription>{runResult}</AlertDescription>
        </Alert>
      )}

      {/* Create form */}
      <Card>
        <CardHeader>
          <CardTitle>Create Workflow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="wf-name">Workflow Name</Label>
              <Input
                id="wf-name"
                placeholder="Workflow name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wf-desc">Description</Label>
              <Input
                id="wf-desc"
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="wf-yaml">YAML Definition</Label>
            <Textarea
              id="wf-yaml"
              className="font-mono text-sm"
              rows={10}
              placeholder="Paste YAML workflow definition..."
              value={yaml}
              onChange={(e) => setYaml(e.target.value)}
            />
          </div>
          <Button
            disabled={creating || !name.trim() || !yaml.trim()}
            onClick={handleCreate}
          >
            {creating ? "Creating..." : "Create Workflow"}
          </Button>
        </CardContent>
      </Card>

      {/* Dry-run toggle */}
      <div className="flex items-center gap-3">
        <Switch
          id="dry-run"
          checked={dryRun}
          onCheckedChange={setDryRun}
        />
        <Label htmlFor="dry-run" className="cursor-pointer text-muted-foreground">
          Dry-run mode
        </Label>
      </div>

      {/* Workflow list */}
      {loading ? (
        <Card>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      ) : workflows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <GitBranch size={32} className="mb-2 opacity-40" />
            <p className="text-sm">No workflows defined yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {workflows.map((wf) => (
            <Collapsible
              key={wf.id}
              open={expandedId === wf.id}
              onOpenChange={(open) => setExpandedId(open ? wf.id : null)}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle>{wf.name}</CardTitle>
                      <CardDescription>
                        {wf.description || "No description"}
                      </CardDescription>
                      <p className="text-xs text-muted-foreground">
                        Created {new Date(wf.created_at).toLocaleDateString()}
                        {!wf.is_active && (
                          <Badge variant="secondary" className="ml-2 bg-muted text-muted-foreground">
                            inactive
                          </Badge>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => handleRun(wf.id)}
                      >
                        {dryRun ? "Dry Run" : "Run"}
                      </Button>
                      <CollapsibleTrigger asChild>
                        <Button variant="outline" size="sm">
                          {expandedId === wf.id ? (
                            <>
                              <ChevronDown className="size-4 mr-1" />
                              Hide Runs
                            </>
                          ) : (
                            <>
                              <ChevronRight className="size-4 mr-1" />
                              Show Runs
                            </>
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteTarget(wf)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CollapsibleContent>
                  <Separator />
                  <CardContent className="pt-4">
                    <WorkflowRuns workflowId={wf.id} />
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      )}

      {/* Confirm delete modal */}
      {deleteTarget && (
        <ConfirmModal
          title="Delete Workflow"
          message={
            <>
              Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This cannot be undone.
            </>
          }
          confirmLabel="Delete"
          confirmVariant="danger"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
