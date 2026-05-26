import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/db';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { motion } from 'motion/react';
import { CalendarRange, Image as ImageIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';

export function CreateEvent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 800;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.6); // Compress
        setImagePreview(dataUrl);
      };
      if (typeof event.target?.result === 'string') {
        img.src = event.target.result;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;
    // Use the compressed image string or fallback
    const imageUrl = imagePreview || `https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80`;

    setTimeout(async () => {
      const event = await db.createEvent(user!.id, name, description, startDate, endDate, imageUrl);
      toast.success("Event successfully created!");
      navigate(`/events/${event.id}`);
    }, 500); // Simulate network
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-slate-900">Create Event</h1>
        <p className="text-slate-500 mt-2">Set up a new event as a Draft. You can add missions and rewards before publishing.</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-medium text-slate-700">Event Name</label>
              <input required id="name" name="name" type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors" placeholder="e.g. Nomad Coding Jam" />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="block text-sm font-medium text-slate-700">Description</label>
              <textarea required id="description" name="description" rows={4} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors" placeholder="Describe the event..."></textarea>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="startDate" className="block text-sm font-medium text-slate-700">Start Date</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <CalendarRange size={16} className="text-slate-400" />
                  </div>
                  <input required id="startDate" name="startDate" type="date" className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-500 transition-colors" />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="endDate" className="block text-sm font-medium text-slate-700">End Date</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <CalendarRange size={16} className="text-slate-400" />
                  </div>
                  <input required id="endDate" name="endDate" type="date" className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-500 transition-colors" />
                </div>
              </div>
            </div>

            <div className="space-y-2 pb-4">
              <label className="block text-sm font-medium text-slate-700">Event Cover Image</label>
              <div className="mt-1 flex justify-center border-2 border-slate-200 border-dashed rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors relative overflow-hidden group">
                {imagePreview ? (
                   <div className="w-full text-center relative">
                     <img src={imagePreview} alt="Preview" className="max-h-64 mx-auto object-contain" />
                     <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <label htmlFor="file-upload" className="cursor-pointer text-white font-medium px-4 py-2 bg-slate-900/40 rounded-lg backdrop-blur-sm hover:bg-slate-900/60 transition-colors">
                           Change Image
                        </label>
                     </div>
                   </div>
                ) : (
                  <div className="space-y-1 text-center py-8">
                    <ImageIcon className="mx-auto h-12 w-12 text-slate-400" />
                    <div className="flex text-sm text-slate-600 justify-center">
                      <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-brand-600 hover:text-brand-500 focus-within:outline-none">
                        <span>Upload a file</span>
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-slate-500">PNG, JPG up to 10MB</p>
                    <p className="text-xs font-semibold text-brand-600 mt-2 block">Optimal dimensions: 1200x675 (16:9 ratio) for desktop and mobile</p>
                  </div>
                )}
                <input id="file-upload" name="file-upload" type="file" accept="image/*" className="sr-only" onChange={handleImageChange} />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Event'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
