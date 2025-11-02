import React, { useEffect, useState } from 'react'
import { Trash2, Plus, MapPin } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export default function DistrictManager({ onChanged, onClose }: { onChanged?: ()=>void, onClose?: ()=>void }){
  const [districts, setDistricts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [name, setName] = useState('')

  useEffect(()=>{fetchDistricts()},[])

  async function fetchDistricts(){
    setIsLoading(true)
    const r = await supabase.from('districts').select('*').order('name')
    setDistricts(r.data || [])
    setIsLoading(false)
  }

  async function addDistrict(){
    if (!name.trim()) return
    try{
      await supabase.from('districts').insert({ name })
      setName('')
      fetchDistricts()
    }catch(err){
      console.error(err)
      alert('Failed to add district. It might already exist.')
    }
  }

  async function deleteDistrict(id:string){
    if(!confirm('Are you sure you want to delete this district? This action cannot be undone.')) return
    try{
      await supabase.from('districts').delete().eq('id', id)
      fetchDistricts()
    }catch(err){
      console.error(err)
      alert('Failed to delete district. It might be in use by existing tasks.')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      addDistrict()
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <MapPin className="h-5 w-5 text-green-600" />
          Manage Districts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add District Form */}
        <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-lg border">
          <div className="space-y-2">
            <Label htmlFor="districtName" className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              District Name
            </Label>
            <Input
              id="districtName"
              placeholder="Enter district name"
              value={name}
              onChange={e=>setName(e.target.value)}
              onKeyPress={handleKeyPress}
              className="h-10"
            />
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button 
              onClick={addDistrict} 
              disabled={!name.trim()}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-4 w-4" />
              Add District
            </Button>
            {onClose && (
              <Button variant="outline" onClick={() => {
                if (onChanged) onChanged()
                if (onClose) onClose()
              }}>
                Close
              </Button>
            )}
          </div>
        </div>

        <Separator />

        {/* Districts List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Existing Districts</h3>
            <Badge variant="secondary" className="px-2 py-1">
              {districts.length} district{districts.length !== 1 ? 's' : ''}
            </Badge>
          </div>

          {isLoading ? (
            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                Loading districts...
              </AlertDescription>
            </Alert>
          ) : districts.length === 0 ? (
            <Alert className="bg-amber-50 border-amber-200">
              <AlertDescription className="text-amber-800">
                No districts created yet. Add your first district above to get started.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-3">
              {districts.map(district => (
                <div 
                  key={district.id} 
                  className="flex items-center justify-between p-3 border rounded-lg bg-white dark:bg-slate-800 hover:shadow-sm transition-all duration-200"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="font-medium text-sm">{district.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={()=>deleteDistrict(district.id)}
                    className="ml-2 text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0 shrink-0"
                    title="Delete district"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
