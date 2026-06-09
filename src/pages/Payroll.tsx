import { useState, useEffect } from "react";
import { onAction } from "@/lib/action-bus";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/hooks/use-business";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, Plus, UserPlus, Calendar, Clock, Briefcase, Building2,
  DollarSign, FileText, CheckCircle, XCircle, AlertCircle
} from "lucide-react";
import { format } from "date-fns";

const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "intern"];
const LEAVE_TYPES = ["annual", "sick", "maternity", "paternity", "unpaid", "compassionate"];

export default function Payroll() {
  const { user } = useAuth();
  const { data: business } = useBusiness();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("employees");
  const [employeeOpen, setEmployeeOpen] = useState(false);
  const [departmentOpen, setDepartmentOpen] = useState(false);
  const [payrollOpen, setPayrollOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);

  // Form states
  const [empForm, setEmpForm] = useState({ full_name: "", email: "", phone: "", position: "", employment_type: "full_time", basic_salary: "", department_id: "", bank_name: "", account_number: "", hire_date: format(new Date(), "yyyy-MM-dd") });
  const [deptForm, setDeptForm] = useState({ name: "", description: "" });
  const [payrollForm, setPayrollForm] = useState({ period_start: "", period_end: "", notes: "" });
  const [leaveForm, setLeaveForm] = useState({ employee_id: "", leave_type: "annual", start_date: "", end_date: "", reason: "" });

  const fmt = (n: number) => `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;

  // Queries
  const { data: employees, isLoading: empLoading } = useQuery({
    queryKey: ["employees", business?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("employees_hr").select("*, departments(name)").eq("business_id", business!.id).order("full_name");
      if (error) throw error;
      return data;
    },
    enabled: !!business?.id,
  });

  const { data: departments } = useQuery({
    queryKey: ["departments", business?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("departments").select("*").eq("business_id", business!.id).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!business?.id,
  });

  const { data: payrollRuns } = useQuery({
    queryKey: ["payroll-runs", business?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("payroll_runs").select("*").eq("business_id", business!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!business?.id,
  });

  const { data: leaveRequests } = useQuery({
    queryKey: ["leave-requests", business?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("leave_requests").select("*, employees_hr(full_name)").eq("business_id", business!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!business?.id,
  });

  const { data: attendance } = useQuery({
    queryKey: ["attendance", business?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("attendance").select("*, employees_hr(full_name)").eq("business_id", business!.id).order("date", { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!business?.id,
  });

  // Mutations
  const addEmployee = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("employees_hr").insert({
        business_id: business!.id,
        full_name: empForm.full_name,
        email: empForm.email || null,
        phone: empForm.phone || null,
        position: empForm.position || null,
        employment_type: empForm.employment_type,
        basic_salary: parseFloat(empForm.basic_salary) || 0,
        department_id: empForm.department_id || null,
        bank_name: empForm.bank_name || null,
        account_number: empForm.account_number || null,
        hire_date: empForm.hire_date,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setEmployeeOpen(false);
      setEmpForm({ full_name: "", email: "", phone: "", position: "", employment_type: "full_time", basic_salary: "", department_id: "", bank_name: "", account_number: "", hire_date: format(new Date(), "yyyy-MM-dd") });
      toast({ title: "Employee added" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const addDepartment = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("departments").insert({
        business_id: business!.id,
        name: deptForm.name,
        description: deptForm.description || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      setDepartmentOpen(false);
      setDeptForm({ name: "", description: "" });
      toast({ title: "Department created" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const runPayroll = useMutation({
    mutationFn: async () => {
      if (!employees || employees.length === 0) throw new Error("No employees to process");
      const activeEmps = employees.filter((e) => e.status === "active");

      const totalGross = activeEmps.reduce((s, e) => s + e.basic_salary, 0);
      const totalDeductions = totalGross * 0.175; // ~17.5% combined tax+pension estimate
      const totalNet = totalGross - totalDeductions;

      const { data: run, error: runErr } = await supabase.from("payroll_runs").insert({
        business_id: business!.id,
        period_start: payrollForm.period_start,
        period_end: payrollForm.period_end,
        total_gross: totalGross,
        total_deductions: totalDeductions,
        total_net: totalNet,
        status: "draft",
        created_by: user!.id,
        notes: payrollForm.notes || null,
      }).select().single();
      if (runErr) throw runErr;

      const items = activeEmps.map((emp) => {
        const taxDed = emp.basic_salary * 0.075;
        const pensionDed = emp.basic_salary * 0.10;
        return {
          payroll_run_id: run.id,
          employee_id: emp.id,
          basic_salary: emp.basic_salary,
          allowances: 0,
          overtime: 0,
          gross_pay: emp.basic_salary,
          tax_deduction: taxDed,
          pension_deduction: pensionDed,
          other_deductions: 0,
          net_pay: emp.basic_salary - taxDed - pensionDed,
        };
      });
      const { error: itemErr } = await supabase.from("payroll_items").insert(items);
      if (itemErr) throw itemErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-runs"] });
      setPayrollOpen(false);
      setPayrollForm({ period_start: "", period_end: "", notes: "" });
      toast({ title: "Payroll run created" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const submitLeave = useMutation({
    mutationFn: async () => {
      const start = new Date(leaveForm.start_date);
      const end = new Date(leaveForm.end_date);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      const { error } = await supabase.from("leave_requests").insert({
        business_id: business!.id,
        employee_id: leaveForm.employee_id,
        leave_type: leaveForm.leave_type,
        start_date: leaveForm.start_date,
        end_date: leaveForm.end_date,
        days_count: days,
        reason: leaveForm.reason || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      setLeaveOpen(false);
      setLeaveForm({ employee_id: "", leave_type: "annual", start_date: "", end_date: "", reason: "" });
      toast({ title: "Leave request submitted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateLeaveStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("leave_requests").update({ status, approved_by: user!.id, approved_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      toast({ title: "Leave request updated" });
    },
  });

  if (!business) {
    return (
      <div className="max-w-7xl">
        <h1 className="text-2xl font-bold font-display text-foreground mb-4">Payroll & HR</h1>
        <Card><CardContent className="py-12 text-center text-muted-foreground">Register a business first.</CardContent></Card>
      </div>
    );
  }

  const activeEmployees = employees?.filter((e) => e.status === "active") || [];
  const totalPayroll = activeEmployees.reduce((s, e) => s + e.basic_salary, 0);

  return (
    <div className="max-w-7xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Payroll & HR</h1>
          <p className="text-muted-foreground text-sm">Manage employees, payroll, attendance & leave</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div><div><p className="text-xs text-muted-foreground">Active Staff</p><p className="text-xl font-bold">{activeEmployees.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Building2 className="h-5 w-5 text-primary" /></div><div><p className="text-xs text-muted-foreground">Departments</p><p className="text-xl font-bold">{departments?.length || 0}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><DollarSign className="h-5 w-5 text-primary" /></div><div><p className="text-xs text-muted-foreground">Monthly Payroll</p><p className="text-xl font-bold">{fmt(totalPayroll)}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Calendar className="h-5 w-5 text-primary" /></div><div><p className="text-xs text-muted-foreground">Pending Leave</p><p className="text-xl font-bold">{leaveRequests?.filter((l) => l.status === "pending").length || 0}</p></div></div></CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto scrollbar-thin">
          <TabsList className="w-max sm:w-auto">
            <TabsTrigger value="employees" className="min-h-[44px]"><Users className="h-4 w-4 mr-1" />Employees</TabsTrigger>
            <TabsTrigger value="departments" className="min-h-[44px]"><Building2 className="h-4 w-4 mr-1" />Depts</TabsTrigger>
            <TabsTrigger value="payroll" className="min-h-[44px]"><DollarSign className="h-4 w-4 mr-1" />Payroll</TabsTrigger>
            <TabsTrigger value="attendance" className="min-h-[44px]"><Clock className="h-4 w-4 mr-1" />Attendance</TabsTrigger>
            <TabsTrigger value="leave" className="min-h-[44px]"><Calendar className="h-4 w-4 mr-1" />Leave</TabsTrigger>
          </TabsList>
        </div>

        {/* Employees Tab */}
        <TabsContent value="employees" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Employee Directory</CardTitle>
              <Button size="sm" onClick={() => setEmployeeOpen(true)}><Plus className="h-4 w-4 mr-1" />Add Employee</Button>
            </CardHeader>
            <CardContent>
              {empLoading ? <Skeleton className="h-32" /> : (
                <ResponsiveTable>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden sm:table-cell">Position</TableHead>
                      <TableHead className="hidden md:table-cell">Department</TableHead>
                      <TableHead className="hidden sm:table-cell">Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Salary</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees?.map((emp: any) => (
                      <TableRow key={emp.id}>
                        <TableCell><div><p className="font-medium">{emp.full_name}</p><p className="text-xs text-muted-foreground">{emp.email}</p></div></TableCell>
                        <TableCell className="hidden sm:table-cell">{emp.position || "—"}</TableCell>
                        <TableCell className="hidden md:table-cell">{emp.departments?.name || "—"}</TableCell>
                        <TableCell className="hidden sm:table-cell"><Badge variant="outline">{emp.employment_type.replace("_", " ")}</Badge></TableCell>
                        <TableCell><Badge variant={emp.status === "active" ? "default" : "secondary"}>{emp.status}</Badge></TableCell>
                        <TableCell className="text-right font-semibold">{fmt(emp.basic_salary)}</TableCell>
                      </TableRow>
                    ))}
                    {(!employees || employees.length === 0) && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No employees added yet</TableCell></TableRow>}
                  </TableBody>
                </Table>
                </ResponsiveTable>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Departments Tab */}
        <TabsContent value="departments" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Departments</CardTitle>
              <Button size="sm" onClick={() => setDepartmentOpen(true)}><Plus className="h-4 w-4 mr-1" />Add Department</Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {departments?.map((dept) => (
                  <Card key={dept.id} className="border">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10"><Building2 className="h-5 w-5 text-primary" /></div>
                        <div>
                          <p className="font-medium">{dept.name}</p>
                          <p className="text-xs text-muted-foreground">{dept.description || "No description"}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {employees?.filter((e: any) => e.department_id === dept.id).length || 0} members
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {(!departments || departments.length === 0) && <p className="col-span-full text-center text-muted-foreground py-8">No departments created yet</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payroll Tab */}
        <TabsContent value="payroll" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Payroll Runs</CardTitle>
              <Button size="sm" onClick={() => setPayrollOpen(true)}><Plus className="h-4 w-4 mr-1" />Run Payroll</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Run Date</TableHead>
                    <TableHead>Gross</TableHead>
                    <TableHead>Deductions</TableHead>
                    <TableHead>Net</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrollRuns?.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell>{format(new Date(run.period_start), "MMM d")} – {format(new Date(run.period_end), "MMM d, yyyy")}</TableCell>
                      <TableCell>{format(new Date(run.run_date), "MMM d, yyyy")}</TableCell>
                      <TableCell>{fmt(run.total_gross)}</TableCell>
                      <TableCell className="text-destructive">{fmt(run.total_deductions)}</TableCell>
                      <TableCell className="font-semibold">{fmt(run.total_net)}</TableCell>
                      <TableCell><Badge variant={run.status === "completed" ? "default" : "secondary"}>{run.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {(!payrollRuns || payrollRuns.length === 0) && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No payroll runs yet</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Attendance Records</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Clock In</TableHead>
                    <TableHead>Clock Out</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendance?.map((att: any) => (
                    <TableRow key={att.id}>
                      <TableCell className="font-medium">{att.employees_hr?.full_name}</TableCell>
                      <TableCell>{format(new Date(att.date), "MMM d, yyyy")}</TableCell>
                      <TableCell>{att.clock_in ? format(new Date(att.clock_in), "HH:mm") : "—"}</TableCell>
                      <TableCell>{att.clock_out ? format(new Date(att.clock_out), "HH:mm") : "—"}</TableCell>
                      <TableCell>{att.hours_worked || "—"}</TableCell>
                      <TableCell><Badge variant={att.status === "present" ? "default" : att.status === "absent" ? "destructive" : "secondary"}>{att.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {(!attendance || attendance.length === 0) && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No attendance records</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leave Tab */}
        <TabsContent value="leave" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Leave Requests</CardTitle>
              <Button size="sm" onClick={() => setLeaveOpen(true)}><Plus className="h-4 w-4 mr-1" />New Request</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveRequests?.map((lr: any) => (
                    <TableRow key={lr.id}>
                      <TableCell className="font-medium">{lr.employees_hr?.full_name}</TableCell>
                      <TableCell><Badge variant="outline">{lr.leave_type}</Badge></TableCell>
                      <TableCell>{format(new Date(lr.start_date), "MMM d")} – {format(new Date(lr.end_date), "MMM d")}</TableCell>
                      <TableCell>{lr.days_count}</TableCell>
                      <TableCell>
                        <Badge variant={lr.status === "approved" ? "default" : lr.status === "rejected" ? "destructive" : "secondary"}>{lr.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {lr.status === "pending" && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => updateLeaveStatus.mutate({ id: lr.id, status: "approved" })}><CheckCircle className="h-4 w-4 text-green-500" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => updateLeaveStatus.mutate({ id: lr.id, status: "rejected" })}><XCircle className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!leaveRequests || leaveRequests.length === 0) && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No leave requests</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Employee Dialog */}
      <Dialog open={employeeOpen} onOpenChange={setEmployeeOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Employee</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Full Name *</Label><Input value={empForm.full_name} onChange={(e) => setEmpForm({ ...empForm, full_name: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={empForm.email} onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={empForm.phone} onChange={(e) => setEmpForm({ ...empForm, phone: e.target.value })} /></div>
            <div><Label>Position</Label><Input value={empForm.position} onChange={(e) => setEmpForm({ ...empForm, position: e.target.value })} /></div>
            <div>
              <Label>Department</Label>
              <Select value={empForm.department_id} onValueChange={(v) => setEmpForm({ ...empForm, department_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{departments?.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Employment Type</Label>
              <Select value={empForm.employment_type} onValueChange={(v) => setEmpForm({ ...empForm, employment_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EMPLOYMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Hire Date</Label><Input type="date" value={empForm.hire_date} onChange={(e) => setEmpForm({ ...empForm, hire_date: e.target.value })} /></div>
            <div><Label>Basic Salary (₦)</Label><Input type="number" value={empForm.basic_salary} onChange={(e) => setEmpForm({ ...empForm, basic_salary: e.target.value })} /></div>
            <div><Label>Bank Name</Label><Input value={empForm.bank_name} onChange={(e) => setEmpForm({ ...empForm, bank_name: e.target.value })} /></div>
            <div><Label>Account Number</Label><Input value={empForm.account_number} onChange={(e) => setEmpForm({ ...empForm, account_number: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmployeeOpen(false)}>Cancel</Button>
            <Button onClick={() => addEmployee.mutate()} disabled={!empForm.full_name || addEmployee.isPending}>{addEmployee.isPending ? "Adding..." : "Add Employee"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Department Dialog */}
      <Dialog open={departmentOpen} onOpenChange={setDepartmentOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Department</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={deptForm.name} onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea value={deptForm.description} onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDepartmentOpen(false)}>Cancel</Button>
            <Button onClick={() => addDepartment.mutate()} disabled={!deptForm.name || addDepartment.isPending}>{addDepartment.isPending ? "Creating..." : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Run Payroll Dialog */}
      <Dialog open={payrollOpen} onOpenChange={setPayrollOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Run Payroll</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Period Start *</Label><Input type="date" value={payrollForm.period_start} onChange={(e) => setPayrollForm({ ...payrollForm, period_start: e.target.value })} /></div>
            <div><Label>Period End *</Label><Input type="date" value={payrollForm.period_end} onChange={(e) => setPayrollForm({ ...payrollForm, period_end: e.target.value })} /></div>
            <div><Label>Notes</Label><Textarea value={payrollForm.notes} onChange={(e) => setPayrollForm({ ...payrollForm, notes: e.target.value })} /></div>
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p>Active employees: <span className="font-semibold">{activeEmployees.length}</span></p>
              <p>Estimated gross: <span className="font-semibold">{fmt(totalPayroll)}</span></p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayrollOpen(false)}>Cancel</Button>
            <Button onClick={() => runPayroll.mutate()} disabled={!payrollForm.period_start || !payrollForm.period_end || runPayroll.isPending}>{runPayroll.isPending ? "Processing..." : "Run Payroll"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave Request Dialog */}
      <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Leave Request</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Employee *</Label>
              <Select value={leaveForm.employee_id} onValueChange={(v) => setLeaveForm({ ...leaveForm, employee_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>{employees?.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Leave Type</Label>
              <Select value={leaveForm.leave_type} onValueChange={(v) => setLeaveForm({ ...leaveForm, leave_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LEAVE_TYPES.map((t) => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Start Date *</Label><Input type="date" value={leaveForm.start_date} onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })} /></div>
            <div><Label>End Date *</Label><Input type="date" value={leaveForm.end_date} onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })} /></div>
            <div><Label>Reason</Label><Textarea value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLeaveOpen(false)}>Cancel</Button>
            <Button onClick={() => submitLeave.mutate()} disabled={!leaveForm.employee_id || !leaveForm.start_date || !leaveForm.end_date || submitLeave.isPending}>{submitLeave.isPending ? "Submitting..." : "Submit"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
