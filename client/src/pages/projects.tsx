import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, FolderOpen, Calendar, DollarSign, User, Clock, CheckCircle, AlertCircle, PlayCircle, PauseCircle, MoreHorizontal, Edit, Trash2, Link, X, Globe2, Building, MapPin } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Project, Lead } from "@shared/schema";

const STATUS_CONFIG = {
  planning: { label: 'Planning', icon: Clock, color: 'bg-blue-500', textColor: 'text-blue-600' },
  in_progress: { label: 'In Progress', icon: PlayCircle, color: 'bg-green-500', textColor: 'text-green-600' },
  on_hold: { label: 'On Hold', icon: PauseCircle, color: 'bg-yellow-500', textColor: 'text-yellow-600' },
  completed: { label: 'Completed', icon: CheckCircle, color: 'bg-emerald-500', textColor: 'text-emerald-600' },
  cancelled: { label: 'Cancelled', icon: AlertCircle, color: 'bg-red-500', textColor: 'text-red-600' },
};

const PRIORITY_CONFIG = {
  low: { label: 'Low', color: 'bg-gray-100 text-gray-700' },
  medium: { label: 'Medium', color: 'bg-orange-100 text-orange-700' },
  high: { label: 'High', color: 'bg-red-100 text-red-700' },
};

function ProjectCard({ project, onEdit, onDelete }: { project: Project; onEdit: (project: Project) => void; onDelete: (project: Project) => void }) {
  const statusConfig = STATUS_CONFIG[project.status];
  const priorityConfig = PRIORITY_CONFIG[project.priority];
  const StatusIcon = statusConfig.icon;

  return (
    <Card className="hover-elevate">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base truncate">{project.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{project.client}</p>
          </div>
          <Badge className={`${priorityConfig.color} border-0 text-xs`}>
            {priorityConfig.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {project.description}
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(project)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(project)} className="text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="flex items-center gap-2">
          <StatusIcon className={`w-4 h-4 ${statusConfig.textColor}`} />
          <span className="text-sm font-medium">{statusConfig.label}</span>
        </div>

        {project.budget && (
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">${project.budget.toLocaleString()}</span>
          </div>
        )}

        {project.technologies && project.technologies.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {project.technologies.slice(0, 3).map((tech) => (
              <Badge key={tech} variant="secondary" className="text-[10px]">
                {tech}
              </Badge>
            ))}
            {project.technologies.length > 3 && (
              <Badge variant="secondary" className="text-[10px]">
                +{project.technologies.length - 3}
              </Badge>
            )}
          </div>
        )}

        {project.leadId && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link className="w-3 h-3" />
            <span>Connected to lead #{project.leadId}</span>
          </div>
        )}

        {project.startDate && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            Started: {new Date(project.startDate).toLocaleDateString()}
          </div>
        )}
        
        {project.endDate && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            Due: {new Date(project.endDate).toLocaleDateString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AddProjectDialog() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    client: '',
    description: '',
    status: 'planning' as const,
    priority: 'medium' as const,
    budget: '',
    startDate: '',
    endDate: '',
    technologies: '',
    notes: '',
    leadId: null as number | null,
  });
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showLeadSelector, setShowLeadSelector] = useState(false);

  const queryClient = useQueryClient();

  // Fetch leads for selection
  const { data: leads = [] } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
    queryFn: async () => {
      const response = await fetch('/api/leads');
      if (!response.ok) throw new Error('Failed to fetch leads');
      return response.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          budget: data.budget ? parseFloat(data.budget) : null,
          startDate: data.startDate ? new Date(data.startDate) : null,
          endDate: data.endDate ? new Date(data.endDate) : null,
          technologies: data.technologies.split(',').map(t => t.trim()).filter(t => t),
          notes: data.notes || null,
          leadId: data.leadId,
          userId: 'current-user', // This would come from auth context
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create project');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setOpen(false);
      setFormData({
        name: '',
        client: '',
        description: '',
        status: 'planning',
        priority: 'medium',
        budget: '',
        startDate: '',
        endDate: '',
        technologies: '',
        notes: '',
        leadId: null,
      });
      setSelectedLead(null);
    },
  });

  const handleLeadSelect = (lead: Lead) => {
    setSelectedLead(lead);
    setFormData(prev => ({
      ...prev,
      leadId: lead.id,
      // Auto-fill from lead data
      client: lead.companyName || prev.client,
      description: prev.description || `Project for ${lead.companyName}${lead.industry ? ` in ${lead.industry}` : ''}${lead.websiteUrl && lead.websiteUrl !== 'none' ? ` - Website: ${lead.websiteUrl}` : ''}`,
      technologies: prev.technologies || (lead.detectedTechnologies ? lead.detectedTechnologies.join(', ') : ''),
      notes: prev.notes || `Converted from lead #${lead.id}. ${lead.notes || ''}`,
    }));
    setShowLeadSelector(false);
  };

  const handleRemoveLead = () => {
    setSelectedLead(null);
    setFormData(prev => ({
      ...prev,
      leadId: null,
      // Keep the auto-filled data but allow editing
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Project
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="client">Client Name</Label>
              <Input
                id="client"
                value={formData.client}
                onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Lead Selection Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Link to Lead (Optional)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowLeadSelector(true)}
                className="gap-2"
              >
                <Link className="w-4 h-4" />
                {selectedLead ? 'Change Lead' : 'Select Lead'}
              </Button>
            </div>
            
            {selectedLead ? (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="font-medium text-blue-900">{selectedLead.companyName}</span>
                      <Badge variant="secondary" className="text-xs">
                        Lead #{selectedLead.id}
                      </Badge>
                    </div>
                    <div className="text-sm text-blue-700 space-y-1">
                      {selectedLead.websiteUrl && selectedLead.websiteUrl !== 'none' && (
                        <div className="flex items-center gap-1">
                          <Globe2 className="w-3 h-3" />
                          <span>{selectedLead.websiteUrl}</span>
                        </div>
                      )}
                      {selectedLead.industry && (
                        <div className="flex items-center gap-1">
                          <Building className="w-3 h-3" />
                          <span>{selectedLead.industry}</span>
                        </div>
                      )}
                      {selectedLead.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>{selectedLead.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveLead}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  ✓ Lead info auto-filled. You can still edit any field before saving.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-center">
                <Link className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  Select a lead to auto-fill project information
                </p>
                <p className="text-xs text-gray-500">
                  Or create a standalone project
                </p>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                    <SelectItem key={value} value={value}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(value: any) => setFormData({ ...formData, priority: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="budget">Budget ($)</Label>
              <Input
                id="budget"
                type="number"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="technologies">Technologies (comma-separated)</Label>
              <Input
                id="technologies"
                placeholder="React, Node.js, TypeScript"
                value={formData.technologies}
                onChange={(e) => setFormData({ ...formData, technologies: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional project notes..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Adding...' : 'Add Project'}
            </Button>
          </div>
        </form>
      </DialogContent>

      {/* Lead Selection Dialog */}
      <Dialog open={showLeadSelector} onOpenChange={setShowLeadSelector}>
        <DialogContent className="max-w-2xl max-h-[60vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Lead</DialogTitle>
            <DialogDescription>
              Choose a lead to auto-fill project information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {leads.map((lead) => (
              <div
                key={lead.id}
                className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => handleLeadSelect(lead)}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                    <Building className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{lead.companyName}</div>
                    <div className="text-sm text-gray-500">{lead.websiteUrl}</div>
                    {lead.industry && (
                      <Badge variant="secondary" className="text-xs mt-1">
                        {lead.industry}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

export default function ProjectsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      const response = await fetch('/api/projects');
      if (!response.ok) throw new Error('Failed to fetch projects');
      return response.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete project');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    },
  });

  const stats = {
    total: projects.length,
    planning: projects.filter((p: Project) => p.status === 'planning').length,
    inProgress: projects.filter((p: Project) => p.status === 'in_progress').length,
    completed: projects.filter((p: Project) => p.status === 'completed').length,
  };

  const handleEdit = (project: Project) => {
    console.log('Edit project:', project);
  };

  const handleDelete = (project: Project) => {
    deleteMutation.mutate(project.id);
  };

  const filteredProjects = projects.filter((project: Project) => {
    const matchesSearch = !search || 
      project.name.toLowerCase().includes(search.toLowerCase()) ||
      project.client.toLowerCase().includes(search.toLowerCase()) ||
      project.description.toLowerCase().includes(search.toLowerCase());
    
    const matchesFilter = filter === 'all' || project.status === filter;
    
    return matchesSearch && matchesFilter;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground">Manage your client projects</p>
        </div>
        <AddProjectDialog />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Total Projects</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">{stats.planning}</div>
            <p className="text-sm text-muted-foreground">Planning</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">{stats.inProgress}</div>
            <p className="text-sm text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold">{stats.completed}</div>
            <p className="text-sm text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="planning">Planning</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No projects found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {search || filter !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Get started by adding your first client project'
              }
            </p>
            {!search && filter === 'all' && <AddProjectDialog />}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project: Project) => (
            <ProjectCard 
              key={project.id} 
              project={project} 
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
