"use client";

import { useState } from 'react';
import { 
  Users, Upload, Settings, RefreshCw, Download, 
  CheckCircle2, AlertTriangle, ChevronDown, ChevronRight, Play, Eye
} from 'lucide-react';
import { importOrgCsvAction, regenerateHrmsSecretAction } from './actions';

interface User {
  id: string;
  employee_id: string | null;
  name: string;
  email: string;
  status: string;
  designation: string | null;
  career_level: string | null;
  department: string | null;
  manager_employee_id: string | null;
}

interface OrgNode {
  id: string;
  user_id: string | null;
  parent_id: string | null;
  title: string | null;
}

interface HrmsSyncLog {
  id: string;
  source: string;
  changes: any;
  applied_at: string;
}

interface OrgAdminConsoleProps {
  tenantSubdomain: string;
  initialUsers: User[];
  initialOrgNodes: OrgNode[];
  initialSecret: string | null;
  initialSyncLogs: HrmsSyncLog[];
}

interface TreeNode {
  id: string;
  userId: string;
  name: string;
  email: string;
  designation: string;
  careerLevel: string;
  status: string;
  children: TreeNode[];
}

export default function OrgAdminConsole({
  tenantSubdomain,
  initialUsers,
  initialOrgNodes,
  initialSecret,
  initialSyncLogs
}: OrgAdminConsoleProps) {
  const [activeTab, setActiveTab] = useState<'chart' | 'import' | 'api'>('chart');
  const [secret, setSecret] = useState<string | null>(initialSecret);
  const [syncLogs, setSyncLogs] = useState<HrmsSyncLog[]>(initialSyncLogs);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // CSV States
  const [csvText, setCsvText] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [summary, setSummary] = useState({ newCount: 0, updateCount: 0, deactivateCount: 0, errorCount: 0 });
  const [isUploading, setIsUploading] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Hierarchy Tree Construction
  const userMap = new Map<string, User>();
  for (const u of initialUsers) {
    userMap.set(u.id, u);
  }

  const nodesByUser = new Map<string, OrgNode>();
  for (const n of initialOrgNodes) {
    if (n.user_id) {
      nodesByUser.set(n.user_id, n);
    }
  }

  const treeNodesMap = new Map<string, TreeNode>();
  for (const u of initialUsers) {
    const node = nodesByUser.get(u.id);
    treeNodesMap.set(node?.id || u.id, {
      id: node?.id || u.id,
      userId: u.id,
      name: u.name,
      email: u.email,
      designation: u.designation || 'Staff',
      careerLevel: u.career_level || 'L1',
      status: u.status,
      children: []
    });
  }

  const rootNodes: TreeNode[] = [];
  for (const u of initialUsers) {
    const node = nodesByUser.get(u.id);
    const treeNode = treeNodesMap.get(node?.id || u.id);
    if (!treeNode) continue;

    if (node && node.parent_id) {
      const parentNode = treeNodesMap.get(node.parent_id);
      if (parentNode) {
        parentNode.children.push(treeNode);
      } else {
        rootNodes.push(treeNode);
      }
    } else {
      rootNodes.push(treeNode);
    }
  }

  // Recursive Tree Node Renderer
  function TreeNodeComponent({ node, depth = 0 }: { node: TreeNode; depth: number }) {
    const [isExpanded, setIsExpanded] = useState(true);
    const hasChildren = node.children.length > 0;

    return (
      <div className="select-none font-body">
        <div 
          className="flex items-center gap-3 py-2 px-4 hover:bg-gray-50 rounded-xl transition cursor-pointer group"
          onClick={() => hasChildren && setIsExpanded(!isExpanded)}
          style={{ paddingLeft: `${depth * 24 + 16}px` }}
        >
          <div className="w-5 h-5 flex items-center justify-center text-gray-400">
            {hasChildren ? (
              isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
            ) : (
              <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
            )}
          </div>
          <div className="flex-1 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="font-bold text-ink text-sm group-hover:text-accent transition">
                {node.name}
              </span>
              <span className="text-xs text-gray-400 ml-2 font-medium">
                ({node.email})
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="inline-flex text-[10px] font-bold rounded-md bg-gray-100 text-gray-500 uppercase tracking-wider px-1.5">
                  {node.designation}
                </span>
                <span className="inline-flex text-[10px] font-bold rounded-md bg-accent/5 text-accent uppercase tracking-wider px-1.5">
                  {node.careerLevel}
                </span>
              </div>
            </div>
            <div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-bold uppercase tracking-wider ${
                node.status === 'active' || node.status === 'ACTIVE' 
                  ? 'bg-green-50 text-green-700 border border-green-100' 
                  : 'bg-red-50 text-red-700 border border-red-100'
              }`}>
                {node.status}
              </span>
            </div>
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div className="relative">
            {/* Connector line */}
            <div 
              className="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-100"
              style={{ left: `${depth * 24 + 25}px` }}
            />
            {node.children.map(child => (
              <TreeNodeComponent key={child.id} node={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // CSV Parser (RFC 4180 compliant)
  function parseCSV(text: string): string[][] {
    const lines: string[][] = [];
    let row: string[] = [];
    let cell = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      const next = text[i + 1];

      if (inQuotes) {
        if (c === '"') {
          if (next === '"') {
            cell += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          cell += c;
        }
      } else {
        if (c === '"') {
          inQuotes = true;
        } else if (c === ',') {
          row.push(cell);
          cell = '';
        } else if (c === '\r' || c === '\n') {
          row.push(cell);
          cell = '';
          if (row.some(x => x)) {
            lines.push(row);
          }
          row = [];
          if (c === '\r' && next === '\n') {
            i++;
          }
        } else {
          cell += c;
        }
      }
    }
    if (cell || row.length > 0) {
      row.push(cell);
      if (row.some(x => x)) {
        lines.push(row);
      }
    }
    return lines;
  }

  // Handle CSV Select
  const handleCsvSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsUploading(true);
    setMessage(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setCsvText(text);
      processCsvPreview(text);
      setIsUploading(false);
    };
    reader.readAsText(file);
  };

  // Preview CSV Updates
  const processCsvPreview = (text: string) => {
    const parsed = parseCSV(text);
    if (parsed.length <= 1) {
      setPreviewRows([]);
      setSummary({ newCount: 0, updateCount: 0, deactivateCount: 0, errorCount: 0 });
      setMessage({ type: 'error', text: 'CSV is empty or missing data rows.' });
      return;
    }

    const headers = parsed[0].map(h => h.trim().toLowerCase());
    const expectedHeaders = ['employee_id', 'name', 'email', 'designation', 'career_level', 'department', 'manager_employee_id', 'status'];
    const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));

    if (missingHeaders.length > 0) {
      setPreviewRows([]);
      setSummary({ newCount: 0, updateCount: 0, deactivateCount: 0, errorCount: 0 });
      setMessage({ type: 'error', text: `Missing required CSV headers: ${missingHeaders.join(', ')}` });
      return;
    }

    const colIndex = (name: string) => headers.indexOf(name);
    const dataRows = parsed.slice(1);

    const dbUsersByEmpId = new Map<string, User>();
    const dbUsersByEmail = new Map<string, User>();
    for (const u of initialUsers) {
      if (u.employee_id) dbUsersByEmpId.set(u.employee_id, u);
      dbUsersByEmail.set(u.email.toLowerCase(), u);
    }

    const seenEmpIdsInFile = new Set<string>();
    const seenEmailsInFile = new Set<string>();
    
    let newCount = 0;
    let updateCount = 0;
    let deactivateCount = 0;
    let errorCount = 0;

    const rowsPreview = dataRows.map((cols, idx) => {
      const empId = (cols[colIndex('employee_id')] || '').trim();
      const name = (cols[colIndex('name')] || '').trim();
      const email = (cols[colIndex('email')] || '').trim().toLowerCase();
      const designation = (cols[colIndex('designation')] || '').trim();
      const careerLevel = (cols[colIndex('career_level')] || '').trim();
      const department = (cols[colIndex('department')] || '').trim();
      const managerId = (cols[colIndex('manager_employee_id')] || '').trim();
      const status = (cols[colIndex('status')] || '').trim().toLowerCase();

      let error = '';
      let actionType: 'new' | 'update' | 'deactivate' | 'error' = 'new';

      if (!empId) {
        error = 'Missing employee_id';
        actionType = 'error';
      } else if (!email) {
        error = 'Missing email';
        actionType = 'error';
      } else if (!name) {
        error = 'Missing name';
        actionType = 'error';
      } else if (seenEmpIdsInFile.has(empId)) {
        error = `Duplicate employee_id ${empId} in file`;
        actionType = 'error';
      } else if (seenEmailsInFile.has(email)) {
        error = `Duplicate email ${email} in file`;
        actionType = 'error';
      }

      if (empId) seenEmpIdsInFile.add(empId);
      if (email) seenEmailsInFile.add(email);

      if (actionType !== 'error') {
        const dbUser = dbUsersByEmpId.get(empId) || dbUsersByEmail.get(email);
        if (dbUser) {
          const isFlippedInactive = status === 'inactive' && dbUser.status === 'active';
          actionType = isFlippedInactive ? 'deactivate' : 'update';
        } else {
          actionType = 'new';
        }
      }

      // Stats tally
      if (actionType === 'new') newCount++;
      else if (actionType === 'update') updateCount++;
      else if (actionType === 'deactivate') deactivateCount++;
      else if (actionType === 'error') errorCount++;

      return {
        rowNum: idx + 2,
        employee_id: empId,
        name,
        email,
        designation,
        career_level: careerLevel,
        department,
        manager_employee_id: managerId,
        status,
        actionType,
        error
      };
    });

    // Check manager IDs in CSV or DB
    rowsPreview.forEach(r => {
      if (r.actionType !== 'error' && r.manager_employee_id) {
        const managerExistsInFile = seenEmpIdsInFile.has(r.manager_employee_id);
        const managerExistsInDb = dbUsersByEmpId.has(r.manager_employee_id);
        if (!managerExistsInFile && !managerExistsInDb) {
          r.error = `Warning: manager_employee_id ${r.manager_employee_id} not found in file or DB`;
        }
      }
    });

    setPreviewRows(rowsPreview);
    setSummary({ newCount, updateCount, deactivateCount, errorCount });
  };

  // Download Template CSV
  const downloadTemplate = () => {
    const csvContent = "employee_id,name,email,designation,career_level,department,manager_employee_id,status\n" +
      "EMP001,John Doe,john.doe@company.com,CEO,L10,Executive,,active\n" +
      "EMP002,Jane Smith,jane.smith@company.com,VP Engineering,L8,Engineering,EMP001,active\n" +
      "EMP003,Bob Johnson,bob.johnson@company.com,Software Engineer,L4,Engineering,EMP002,active\n" +
      "EMP004,Alice Williams,alice.williams@company.com,Designer,L3,Design,EMP001,inactive";
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "org_hierarchy_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Commit CSV Import
  const handleCommit = async () => {
    if (previewRows.length === 0 || summary.errorCount > 0) return;
    setIsCommitting(true);
    setMessage(null);
    try {
      const payload = previewRows.map(r => ({
        employee_id: r.employee_id,
        name: r.name,
        email: r.email,
        designation: r.designation,
        career_level: r.career_level,
        department: r.department,
        manager_employee_id: r.manager_employee_id,
        status: r.status
      }));

      const res = await importOrgCsvAction(tenantSubdomain, payload);
      if (res.success) {
        setMessage({ 
          type: 'success', 
          text: `Successfully ingested organization! Created: ${res.created}, Updated: ${res.updated}, Deactivated: ${res.deactivated}` 
        });
        setPreviewRows([]);
        setFileName('');
        setSummary({ newCount: 0, updateCount: 0, deactivateCount: 0, errorCount: 0 });
        // Refresh sync log
        window.location.reload();
      } else {
        setMessage({ type: 'error', text: res.errors.join(', ') || 'Failed to import CSV.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'An error occurred during sync.' });
    } finally {
      setIsCommitting(false);
    }
  };

  // Regenerate Sync Secret
  const handleRegenerateSecret = async () => {
    setIsRegenerating(true);
    setMessage(null);
    try {
      const newSecret = await regenerateHrmsSecretAction(tenantSubdomain);
      setSecret(newSecret);
      setMessage({ type: 'success', text: 'Sync secret regenerated successfully!' });
      window.location.reload();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to regenerate secret.' });
    } finally {
      setIsRegenerating(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(new Date(dateStr));
  };

  return (
    <div className="space-y-6">
      <div className="flex border-b border-gray-100 gap-4">
        <button
          onClick={() => setActiveTab('chart')}
          className={`pb-3 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'chart' ? 'border-accent text-accent' : 'border-transparent text-gray-500 hover:text-ink'
          }`}
        >
          <Users className="w-4 h-4" />
          Org Chart
        </button>
        <button
          onClick={() => setActiveTab('import')}
          className={`pb-3 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'import' ? 'border-accent text-accent' : 'border-transparent text-gray-500 hover:text-ink'
          }`}
        >
          <Upload className="w-4 h-4" />
          Import Org (CSV)
        </button>
        <button
          onClick={() => setActiveTab('api')}
          className={`pb-3 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'api' ? 'border-accent text-accent' : 'border-transparent text-gray-500 hover:text-ink'
          }`}
        >
          <Settings className="w-4 h-4" />
          HRMS API Settings
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-sm font-semibold flex items-center gap-3 border ${
          message.type === 'success' 
            ? 'bg-green-50 border-green-100 text-green-700' 
            : 'bg-red-50 border-red-100 text-red-700'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <AlertTriangle className="w-5 h-5 text-red-600" />}
          {message.text}
        </div>
      )}

      {/* Org Chart Tab */}
      {activeTab === 'chart' && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-lg font-display font-extrabold text-ink">SigmaGo Hierarchy</h2>
              <p className="text-xs text-gray-400 font-medium mt-1">Dynamically assembled reporting tree based on manager assignments.</p>
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent/5 text-accent border border-accent/10">
              {initialUsers.length} total staff
            </span>
          </div>

          <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
            {rootNodes.map(node => (
              <TreeNodeComponent key={node.id} node={node} depth={0} />
            ))}
            {rootNodes.length === 0 && (
              <div className="py-12 text-center text-gray-400 text-sm">
                No users found. Import users under the "Import Org" tab.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Import Org Tab */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-lg font-display font-extrabold text-ink">Upload Hierarchy CSV</h2>
                <p className="text-xs text-gray-400 font-medium mt-1">Upload your organization CSV to rebuild and sync reporting lines.</p>
              </div>
              <button
                onClick={downloadTemplate}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:text-accent-light transition"
              >
                <Download className="w-4 h-4" />
                Download Template CSV
              </button>
            </div>

            <div className="flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl py-12 px-6 bg-gray-50/50 hover:bg-gray-50 transition cursor-pointer relative">
              <input
                type="file"
                accept=".csv"
                onChange={handleCsvSelect}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div className="text-center space-y-2">
                <Upload className="w-8 h-8 text-gray-400 mx-auto" />
                <p className="text-sm font-bold text-ink">
                  {fileName ? fileName : 'Select or drop org CSV file'}
                </p>
                <p className="text-xs text-gray-400">
                  File must use the headers specified in the template.
                </p>
              </div>
            </div>
          </div>

          {previewRows.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-ink">Sync Preview</h3>
                  <p className="text-xs text-gray-400 font-medium">Verify changes before applying updates to the live database.</p>
                </div>
                <div className="flex gap-2 flex-wrap text-xs font-bold">
                  <span className="px-2.5 py-1 rounded-md bg-green-50 text-green-700 border border-green-100">
                    New: {summary.newCount}
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                    Update: {summary.updateCount}
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-red-50 text-red-700 border border-red-100">
                    Deactivate: {summary.deactivateCount}
                  </span>
                  {summary.errorCount > 0 && (
                    <span className="px-2.5 py-1 rounded-md bg-yellow-50 text-yellow-700 border border-yellow-100">
                      Errors: {summary.errorCount}
                    </span>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto max-h-[400px]">
                <table className="min-w-full divide-y divide-gray-100 text-sm text-left">
                  <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-6 py-3.5">Row</th>
                      <th className="px-6 py-3.5">Emp ID</th>
                      <th className="px-6 py-3.5">Name</th>
                      <th className="px-6 py-3.5">Email</th>
                      <th className="px-6 py-3.5">Designation</th>
                      <th className="px-6 py-3.5">Manager ID</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5">Change</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {previewRows.map((r, i) => (
                      <tr key={i} className={r.actionType === 'error' ? 'bg-red-50/20' : ''}>
                        <td className="px-6 py-3.5 text-gray-400 font-semibold">{r.rowNum}</td>
                        <td className="px-6 py-3.5 text-ink font-semibold">{r.employee_id}</td>
                        <td className="px-6 py-3.5 text-ink">{r.name}</td>
                        <td className="px-6 py-3.5 text-gray-500">{r.email}</td>
                        <td className="px-6 py-3.5 text-gray-400">{r.designation}</td>
                        <td className="px-6 py-3.5 text-gray-400">{r.manager_employee_id || '-'}</td>
                        <td className="px-6 py-3.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-3xs font-bold uppercase ${
                            r.status === 'active' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-6 py-3.5">
                          {r.actionType === 'error' ? (
                            <span className="text-red-600 flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              {r.error}
                            </span>
                          ) : (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-3xs font-bold uppercase ${
                              r.actionType === 'new' ? 'bg-green-100 text-green-800' :
                              r.actionType === 'deactivate' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {r.actionType}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50/50">
                <button
                  onClick={() => { setPreviewRows([]); setFileName(''); }}
                  className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 bg-white hover:bg-gray-50 transition"
                >
                  Clear
                </button>
                <button
                  onClick={handleCommit}
                  disabled={isCommitting || summary.errorCount > 0}
                  className="inline-flex items-center justify-center rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-accent/10 hover:bg-accent-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 transition duration-150"
                >
                  {isCommitting ? 'Ingesting...' : 'Confirm Import'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* HRMS API Settings Tab */}
      {activeTab === 'api' && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 space-y-4">
            <h2 className="text-lg font-display font-extrabold text-ink border-b border-gray-100 pb-4">
              HRMS Integration Settings
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-ink">
                  Webhook Endpoint URL
                </label>
                <div className="mt-2 flex">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/api/webhooks/hrms/${tenantSubdomain}`}
                    className="block w-full rounded-xl border border-gray-200 py-3 px-4 text-gray-500 bg-gray-50 shadow-sm focus:outline-none sm:text-sm font-mono"
                  />
                </div>
                <p className="text-2xs text-gray-400 mt-1 font-medium">Configure this URL inside your HRMS payload push webhook.</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-ink">
                  HRMS Sync Secret
                </label>
                <div className="mt-2 flex gap-3">
                  <input
                    type="text"
                    readOnly
                    value={secret ? secret : 'No secret configured'}
                    className="block flex-1 rounded-xl border border-gray-200 py-3 px-4 text-gray-500 bg-gray-50 shadow-sm focus:outline-none sm:text-sm font-mono"
                  />
                  <button
                    onClick={handleRegenerateSecret}
                    disabled={isRegenerating}
                    className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 bg-white hover:bg-gray-50 transition shadow-sm"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                    {secret ? 'Regenerate' : 'Create Secret'}
                  </button>
                </div>
                <p className="text-2xs text-gray-400 mt-1 font-medium">Pass this secret in the <strong>x-sync-secret</strong> header of your webhook request.</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-base font-bold text-ink">Recent Sync Logs</h3>
              <p className="text-xs text-gray-400 font-medium">History of automated and manual sync occurrences.</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-6 py-3.5">Time</th>
                    <th className="px-6 py-3.5">Source</th>
                    <th className="px-6 py-3.5">Created</th>
                    <th className="px-6 py-3.5">Updated</th>
                    <th className="px-6 py-3.5">Deactivated</th>
                    <th className="px-6 py-3.5">Errors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-ink">
                  {syncLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-6 py-3.5 whitespace-nowrap text-gray-400 font-semibold">{formatDate(log.applied_at)}</td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-3xs font-bold uppercase ${
                          log.source === 'csv' ? 'bg-purple-50 text-purple-700 border border-purple-100' : 'bg-blue-50 text-blue-700 border border-blue-100'
                        }`}>
                          {log.source}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 font-bold text-green-600">{log.changes?.created_count ?? 0}</td>
                      <td className="px-6 py-3.5 font-bold text-blue-600">{log.changes?.updated_count ?? 0}</td>
                      <td className="px-6 py-3.5 font-bold text-red-600">{log.changes?.deactivated_count ?? 0}</td>
                      <td className="px-6 py-3.5 font-bold text-yellow-600">{log.changes?.errors_count ?? 0}</td>
                    </tr>
                  ))}
                  {syncLogs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-400 text-sm">
                        No sync executions logged yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
