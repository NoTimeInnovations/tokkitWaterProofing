import React, { useEffect, useState } from 'react'
import { Trash2, Plus, TagIcon, Palette } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { getContrastColor } from '@/lib/utils'

export default function TagManager({ onChanged, onClose }: { onChanged?: ()=>void, onClose?: ()=>void }){
  const [tags, setTags] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState('#3b82f6') // Default blue color

  useEffect(()=>{fetchTags()},[])

  async function fetchTags(){
    setIsLoading(true)
    const r = await supabase.from('tags').select('*').order('name')
    setTags(r.data || [])
    setIsLoading(false)
  }

  async function addTag(){
    if (!name.trim()) return
    try{
      await supabase.from('tags').insert({ name, color })
      setName('')
      setColor('#3b82f6') // Reset to default blue
      fetchTags()
      if (onChanged) onChanged()
    }catch(err){console.error(err)}
  }

  async function deleteTag(id:string){
    if(!confirm('Are you sure you want to delete this tag? This action cannot be undone.')) return
    await supabase.from('tags').delete().eq('id', id)
    fetchTags()
    if (onChanged) onChanged()
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      addTag()
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl">
          <TagIcon className="h-5 w-5 text-blue-600" />
          Manage Tags
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add Tag Form */}
        <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-lg border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tagName" className="text-sm font-medium flex items-center gap-2">
                <TagIcon className="h-4 w-4" />
                Tag Name
              </Label>
              <Input
                id="tagName"
                placeholder="Enter tag name"
                value={name}
                onChange={e=>setName(e.target.value)}
                onKeyPress={handleKeyPress}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tagColor" className="text-sm font-medium flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Color
              </Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="tagColor"
                  type="color"
                  value={color}
                  onChange={e=>setColor(e.target.value)}
                  className="w-12 h-10 p-1 cursor-pointer rounded"
                />
                <div 
                  className="w-8 h-8 rounded border"
                  style={{backgroundColor: color}}
                />
                <span className="text-sm text-slate-500 font-mono">
                  {color}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button 
              onClick={addTag} 
              disabled={!name.trim()}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-4 w-4" />
              Add Tag
            </Button>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        <Separator />

        {/* Tags List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Existing Tags</h3>
            <Badge variant="secondary" className="px-2 py-1">
              {tags.length} tag{tags.length !== 1 ? 's' : ''}
            </Badge>
          </div>

          {isLoading ? (
            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                Loading tags...
              </AlertDescription>
            </Alert>
          ) : tags.length === 0 ? (
            <Alert className="bg-amber-50 border-amber-200">
              <AlertDescription className="text-amber-800">
                No tags created yet. Add your first tag above to get started.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-3">
              {tags.map(tag => (
                <div 
                  key={tag.id} 
                  className="flex items-center justify-between p-4 border rounded-lg bg-white dark:bg-slate-800 hover:shadow-sm transition-all duration-200"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div 
                      style={{backgroundColor: tag.color}} 
                      className="w-8 h-8 rounded-lg border-2 border-white shadow-sm flex items-center justify-center"
                    />
                    <div className="flex-1">
                      <span className="font-medium text-sm block">{tag.name}</span>
                      <span className="text-xs text-slate-500 font-mono">
                        {tag.color}
                      </span>
                    </div>
                    <Badge 
                      style={{
                        backgroundColor: tag.color,
                        color: getContrastColor(tag.color)
                      }}
                      className="px-3 py-1 text-xs font-medium"
                    >
                      {tag.name}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={()=>deleteTag(tag.id)}
                    className="ml-4 text-red-600 hover:text-red-700 hover:bg-red-50 h-9 w-9 p-0"
                    title="Delete tag"
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

