import { useState } from 'react'
import { Settings as SettingsIcon, LogOut, Download, MapPin, Tag, ArrowLeft, FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { supabase, signOut } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'
import TagManager from './TagManager'
import DistrictManager from './DistrictManager'
import * as XLSX from 'xlsx'

type SettingsView = 'main' | 'tags' | 'districts'

const Settings = () => {
  const navigate = useNavigate()
  const [currentView, setCurrentView] = useState<SettingsView>('main')
  const [isExporting, setIsExporting] = useState(false)
  const [exportMessage, setExportMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleLogout = async () => {
    if (confirm('Are you sure you want to log out?')) {
      await signOut()
      navigate('/login')
    }
  }

  const handleExportData = async () => {
    setIsExporting(true)
    setExportMessage(null)
    
    try {
      // Fetch all tasks with pagination to bypass 1000 row limit
      let allTasks: any[] = []
      let from = 0
      const pageSize = 1000
      let hasMore = true

      while (hasMore) {
        const { data: tasks, error, count } = await supabase
          .from('tasks_full_data')
          .select(`
            *,
            districts(*),
            task_tags(
              tag_id,
              tags(name, color)
            )
          `, { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(from, from + pageSize - 1)

        if (error) throw error

        if (tasks && tasks.length > 0) {
          allTasks = [...allTasks, ...tasks]
          from += pageSize
          
          // Check if there are more rows
          hasMore = count ? from < count : tasks.length === pageSize
        } else {
          hasMore = false
        }
      }

      // Format data for export with specific column structure
      const exportData = allTasks.map((task, index) => ({
        'NO': index + 1,
        'ENTER DATE': task.entry_date || "",
        'STAFF NAME': task.staff || '',
        'NAME ': task.client_name || '',
        'TAGS': task.task_tags?.map((tt: any) => tt.tags?.name).filter(Boolean).join(', ') || '',
        'PH NO': task.phone_number ?? '',
        'PLACE': task.place || '',
        'DISTRICT': task.districts?.name || task.district || '',
        'SITE VISIT DATE': task.site_visit_date || "",
        'SITE VISIT  PAYMENT': task.site_visit_payment || '',
        'WORK STATUS': task.status || '',
        'WORK START DATE': task.work_start_date || '',
      }))

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(exportData)

      // Auto-size columns
      const colWidths = [
        { wch: 6 },  // NO
        { wch: 12 }, // ENTER DATE
        { wch: 15 }, // STAFF NAME
        { wch: 20 }, // NAME
        { wch: 25 }, // TAGS
        { wch: 15 }, // PH NO
        { wch: 20 }, // PLACE
        { wch: 15 }, // DISTRICT
        { wch: 15 }, // SITE VISIT DATE
        { wch: 18 }, // SITE VISIT PAYMENT
        { wch: 12 }, // WORK STATUS
        { wch: 15 }, // WORK START DATE
      ]
      ws['!cols'] = colWidths

      XLSX.utils.book_append_sheet(wb, ws, 'Tasks')

      // Generate filename with current date
      const fileName = `tasks_export_${new Date().toISOString().split('T')[0]}.xlsx`

      // Download file
      XLSX.writeFile(wb, fileName)

      setExportMessage({ 
        type: 'success', 
        text: `Successfully exported ${exportData.length} tasks to ${fileName}` 
      })
    } catch (error) {
      console.error('Export error:', error)
      setExportMessage({ 
        type: 'error', 
        text: 'Failed to export data. Please try again.' 
      })
    } finally {
      setIsExporting(false)
      // Clear message after 5 seconds
      setTimeout(() => setExportMessage(null), 5000)
    }
  }

  if (currentView === 'tags') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-3">
        <div className="mb-4">
          <Button
            variant="ghost"
            onClick={() => setCurrentView('main')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Settings
          </Button>
        </div>
        <TagManager 
          onClose={() => setCurrentView('main')}
          onChanged={() => {}}
        />
      </div>
    )
  }

  if (currentView === 'districts') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-3">
        <div className="mb-4">
          <Button
            variant="ghost"
            onClick={() => setCurrentView('main')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Settings
          </Button>
        </div>
        <DistrictManager 
          onClose={() => setCurrentView('main')}
          onChanged={() => {}}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-3">
      <div className="max-w-4xl mx-auto">
        {/* Header with Back Button */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <SettingsIcon className="w-6 h-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Manage your application settings and preferences
            </p>
          </div>
          <Button
            variant="default"
            onClick={() => navigate('/')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>

        {/* Export Message */}
        {exportMessage && (
          <Alert className={`mb-3 ${
            exportMessage.type === 'success' 
              ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
              : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
          }`}>
            <AlertDescription className={
              exportMessage.type === 'success' 
                ? 'text-green-800 dark:text-green-300' 
                : 'text-red-800 dark:text-red-300'
            }>
              {exportMessage.text}
            </AlertDescription>
          </Alert>
        )}

        {/* Settings Cards */}
        <div className="space-y-3">
          {/* Manage Tags */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Tag className="w-4 h-4 text-blue-600" />
                Manage Tags
              </CardTitle>
              <CardDescription className="text-xs">
                Create, edit, and organize tags for categorizing tasks
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button 
                onClick={() => setCurrentView('tags')}
                className="gap-2 bg-blue-600 hover:bg-blue-700 h-9 text-sm"
              >
                <Tag className="w-3 h-3" />
                Open Tag Manager
              </Button>
            </CardContent>
          </Card>

          {/* Manage Districts */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="w-4 h-4 text-green-600" />
                Manage Districts
              </CardTitle>
              <CardDescription className="text-xs">
                Add or remove districts for task location management
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button 
                onClick={() => setCurrentView('districts')}
                className="gap-2 bg-green-600 hover:bg-green-700 h-9 text-sm"
              >
                <MapPin className="w-3 h-3" />
                Open District Manager
              </Button>
            </CardContent>
          </Card>

          <Separator className="my-3" />

          {/* Export Data */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileDown className="w-4 h-4 text-purple-600" />
                Export Data
              </CardTitle>
              <CardDescription className="text-xs">
                Download all tasks and related data as an Excel file
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button 
                onClick={handleExportData}
                disabled={isExporting}
                className="gap-2 bg-purple-600 hover:bg-purple-700 h-9 text-sm"
              >
                {isExporting ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-3 h-3" />
                    Export to Excel
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Separator className="my-3" />

          {/* Logout */}
          <Card className="hover:shadow-md transition-shadow border-red-200 dark:border-red-800">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-red-600 dark:text-red-400">
                <LogOut className="w-4 h-4" />
                Logout
              </CardTitle>
              <CardDescription className="text-xs">
                Sign out of your account
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button 
                onClick={handleLogout}
                variant="destructive"
                className="gap-2 h-9 text-sm"
              >
                <LogOut className="w-3 h-3" />
                Logout
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default Settings