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
      <div className="select-none font-sans">
        <div 
          className="flex items-center gap-3 py-2.5 px-4 hover:bg-[#F7FAFC] rounded-lg transition cursor-pointer group"
          onClick={() => hasChildren && setIsExpanded(!isExpanded)}
          style={{ paddingLeft: `${depth * 24 + 16}px` }}
        >
          <div className="w-5 h-5 flex items-center justify-center text-[#8190A0]">
            {hasChildren ? (
              isExpanded ? <ChevronDown className="w-4 h-4 text-[#059DB0]" /> : <ChevronRight className="w-4 h-4 text-[#8190A0]" />
            ) : (
              <div className="w-1.5 h-1.5 rounded-full bg-[#DDE5EC]" />
            )}
          </div>
          <div className="flex-1 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="font-bold text-[#132238] text-xs group-hover:text-[#012F6B] transition">
                {node.name}
              </span>
              <span className="text-[11px] text-[#8190A0] ml-2 font-mono">
                ({node.email})
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-flex text-[10px] font-semibold rounded bg-[#F3F6F8] text-[#526377] uppercase tracking-wider px-1.5 py-0.5 border border-[#DDE5EC]">
                  {node.designation}
                </span>
                <span className="inline-flex text-[10px] font-bold rounded bg-[#F1FBFC] text-[#012F6B] uppercase tracking-wider px-1.5 py-0.5 border border-[#DDE5EC]">
                  {node.careerLevel}
                </span>
              </div>
            </div>
            <div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                node.status === 'active' || node.status === 'ACTIVE' 
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
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
              className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#DDE5EC]"
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
    <div className="space-y-6 font-sans">
      <div className="flex border-b border-[#DDE5EC] gap-6">
        <button
          onClick={() => setActiveTab('chart')}
          className={`pb-3 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'chart' ? 'border-[#059DB0] text-[#012F6B]' : 'border-transparent text-[#526377] hover:text-[#012F6B]'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-[#059DB0]" />
          Org Chart
        </button>
        <button
          onClick={() => setActiveTab('import')}
          className={`pb-3 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'import' ? 'border-[#059DB0] text-[#012F6B]' : 'border-transparent text-[#526377] hover:text-[#012F6B]'
          }`}
        >
          <Upload className="w-3.5 h-3.5 text-[#059DB0]" />
          Import Org (CSV)
        </button>
        <button
          onClick={() => setActiveTab('api')}
          className={`pb-3 text-xs font-bold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'api' ? 'border-[#059DB0] text-[#012F6B]' : 'border-transparent text-[#526377] hover:text-[#012F6B]'
          }`}
        >
          <Settings className="w-3.5 h-3.5 text-[#059DB0]" />
          HRMS API Settings
        </button>
      </div>

      {message && (
        <div className={`p-3.5 rounded-lg text-xs font-semibold flex items-center gap-2.5 border ${
          message.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
          {message.text}
        </div>
      )}

      {/* Org Chart Tab */}
      {activeTab === 'chart' && (
        <div className="bg-white border border-[#DDE5EC] rounded-xl shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#DDE5EC] pb-4">
            <div>
              <h2 className="text-base font-bold text-[#012F6B]">Organization Hierarchy</h2>
              <p className="text-xs text-[#526377] font-medium mt-0.5">Dynamically assembled reporting tree based on manager assignments.</p>
            </div>
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-[#F1FBFC] text-[#012F6B] border border-[#DDE5EC]">
              {initialUsers.length} total staff
            </span>
          </div>

          <div className="divide-y divide-[#DDE5EC] max-h-[600px] overflow-y-auto">
            {rootNodes.map(node => (
              <TreeNodeComponent key={node.id} node={node} depth={0} />
            ))}
            {rootNodes.length === 0 && (
              <div className="py-12 text-center text-[#8190A0] text-xs">
                No users found. Import users under the &quot;Import Org&quot; tab.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Import Org Tab */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          <div className="bg-white border border-[#DDE5EC] rounded-xl shadow-xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#DDE5EC] pb-4">
              <div>
                <h2 className="text-base font-bold text-[#012F6B]">Upload Hierarchy CSV</h2>
                <p className="text-xs text-[#526377] font-medium mt-0.5">Upload your organization CSV to rebuild and sync reporting lines.</p>
              </div>
              <button
                onClick={downloadTemplate}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#059DB0] hover:text-[#078899] transition"
              >
                <Download className="w-3.5 h-3.5" />
                Download Template CSV
              </button>
            </div>

            <div className="flex items-center justify-center border-2 border-dashed border-[#DDE5EC] rounded-xl py-10 px-6 bg-[#F7FAFC] hover:border-[#059DB0]/50 transition cursor-pointer relative">
              <input
                type="file"
                accept=".csv"
                onChange={handleCsvSelect}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div className="text-center space-y-1.5">
                <Upload className="w-7 h-7 text-[#8190A0] mx-auto" />
                <p className="text-xs font-bold text-[#132238]">
                  {fileName ? fileName : 'Select or drop org CSV file'}
                </p>
                <p className="text-[11px] text-[#8190A0]">
                  File must use the headers specified in the template.
                </p>
              </div>
            </div>
          </div>

          {previewRows.length > 0 && (
            <div className="bg-white border border-[#DDE5EC] rounded-xl shadow-xs overflow-hidden">
              <div className="px-5 py-4 border-b border-[#DDE5EC] bg-[#F7FAFC] flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#132238]">Sync Preview</h3>
                  <p className="text-xs text-[#526377] font-medium">Verify changes before applying updates to the live database.</p>
                </div>
                <div className="flex gap-2 flex-wrap text-xs font-bold">
                  <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200">
                    New: {summary.newCount}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] bg-[#F1FBFC] text-[#012F6B] border border-[#DDE5EC]">
                    Update: {summary.updateCount}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] bg-rose-50 text-rose-800 border border-rose-200">
                    Deactivate: {summary.deactivateCount}
                  </span>
                  {summary.errorCount > 0 && (
                    <span className="px-2 py-0.5 rounded text-[11px] bg-amber-50 text-amber-800 border border-amber-200">
                      Errors: {summary.errorCount}
                    </span>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto max-h-[400px]">
                <table className="min-w-full divide-y divide-[#DDE5EC] text-xs text-left">
                  <thead className="bg-[#F7FAFC] text-[#526377] font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Row</th>
                      <th className="px-4 py-3">Emp ID</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Designation</th>
                      <th className="px-4 py-3">Manager ID</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Change</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DDE5EC] font-medium">
                    {previewRows.map((r, i) => (
                      <tr key={i} className={`hover:bg-[#F7FAFC] transition ${r.actionType === 'error' ? 'bg-rose-50/30' : ''}`}>
                        <td className="px-4 py-3 text-[#8190A0] font-mono">{r.rowNum}</td>
                        <td className="px-4 py-3 text-[#132238] font-bold font-mono">{r.employee_id}</td>
                        <td className="px-4 py-3 text-[#132238] font-semibold">{r.name}</td>
                        <td className="px-4 py-3 text-[#526377] font-mono text-[11px]">{r.email}</td>
                        <td className="px-4 py-3 text-[#526377]">{r.designation}</td>
                        <td className="px-4 py-3 text-[#8190A0] font-mono">{r.manager_employee_id || '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            r.status === 'active' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {r.actionType === 'error' ? (
                            <span className="text-rose-600 flex items-center gap-1 font-semibold">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              {r.error}
                            </span>
                          ) : (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              r.actionType === 'new' ? 'bg-emerald-100 text-emerald-900' :
                              r.actionType === 'deactivate' ? 'bg-rose-100 text-rose-900' : 'bg-[#F1FBFC] text-[#012F6B] border border-[#DDE5EC]'
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

              <div className="px-5 py-3.5 border-t border-[#DDE5EC] flex items-center justify-end gap-2.5 bg-[#F7FAFC]">
                <button
                  onClick={() => { setPreviewRows([]); setFileName(''); }}
                  className="px-3.5 py-1.5 border border-[#DDE5EC] rounded-lg text-xs font-semibold text-[#526377] bg-white hover:bg-[#F7FAFC] transition"
                >
                  Clear
                </button>
                <button
                  onClick={handleCommit}
                  disabled={isCommitting || summary.errorCount > 0}
                  className="inline-flex items-center justify-center rounded-lg bg-[#012F6B] hover:bg-[#033E79] px-4 py-1.5 text-xs font-bold text-white shadow-xs disabled:opacity-50 transition"
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
          <div className="bg-white border border-[#DDE5EC] rounded-xl shadow-xs p-5 sm:p-6 space-y-4">
            <h2 className="text-base font-bold text-[#012F6B] border-b border-[#DDE5EC] pb-3">
              HRMS Integration Settings
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#132238] mb-1">
                  Webhook Endpoint URL
                </label>
                <div className="flex">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/api/webhooks/hrms/${tenantSubdomain}`}
                    className="block w-full rounded-lg border border-[#DDE5EC] py-2 px-3 text-xs text-[#526377] bg-[#F7FAFC] shadow-xs focus:outline-none font-mono"
                  />
                </div>
                <p className="text-[11px] text-[#8190A0] mt-1 font-medium">Configure this URL inside your HRMS payload push webhook.</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#132238] mb-1">
                  HRMS Sync Secret
                </label>
                <div className="flex gap-2.5">
                  <input
                    type="text"
                    readOnly
                    value={secret ? secret : 'No secret configured'}
                    className="block flex-1 rounded-lg border border-[#DDE5EC] py-2 px-3 text-xs text-[#526377] bg-[#F7FAFC] shadow-xs focus:outline-none font-mono"
                  />
                  <button
                    onClick={handleRegenerateSecret}
                    disabled={isRegenerating}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-[#DDE5EC] rounded-lg text-xs font-semibold text-[#526377] bg-white hover:bg-[#F7FAFC] hover:text-[#012F6B] transition shadow-xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                    {secret ? 'Regenerate' : 'Create Secret'}
                  </button>
                </div>
                <p className="text-[11px] text-[#8190A0] mt-1 font-medium">Pass this secret in the <strong>x-sync-secret</strong> header of your webhook request.</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#DDE5EC] rounded-xl shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-[#DDE5EC] bg-[#F7FAFC]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#132238]">Recent Sync Logs</h3>
              <p className="text-xs text-[#526377] font-medium">History of automated and manual sync occurrences.</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#DDE5EC] text-xs text-left">
                <thead className="bg-[#F7FAFC] text-[#526377] font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Updated</th>
                    <th className="px-4 py-3">Deactivated</th>
                    <th className="px-4 py-3">Errors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DDE5EC] font-medium text-[#132238]">
                  {syncLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#F7FAFC] transition">
                      <td className="px-4 py-3 whitespace-nowrap text-[#8190A0] font-mono text-[11px]">{formatDate(log.applied_at)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          log.source === 'csv' ? 'bg-[#F1FBFC] text-[#012F6B] border border-[#DDE5EC]' : 'bg-blue-50 text-[#07508B] border border-blue-200'
                        }`}>
                          {log.source}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-emerald-700 font-mono">{log.changes?.created_count ?? 0}</td>
                      <td className="px-4 py-3 font-bold text-[#012F6B] font-mono">{log.changes?.updated_count ?? 0}</td>
                      <td className="px-4 py-3 font-bold text-rose-700 font-mono">{log.changes?.deactivated_count ?? 0}</td>
                      <td className="px-4 py-3 font-bold text-amber-700 font-mono">{log.changes?.errors_count ?? 0}</td>
                    </tr>
                  ))}
                  {syncLogs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-[#8190A0] text-xs font-medium">
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
