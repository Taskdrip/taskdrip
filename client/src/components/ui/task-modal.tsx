import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CloudUpload, X } from "lucide-react";
import type { Campaign } from "@shared/schema";

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: Campaign | null;
  onSubmit: (data: any) => void;
}

export function TaskModal({ isOpen, onClose, campaign, onSubmit }: TaskModalProps) {
  const [taskType, setTaskType] = useState("");
  const [description, setDescription] = useState("");
  const [postUrl, setPostUrl] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted) return;

    const formData = new FormData();
    formData.append('taskType', taskType);
    formData.append('description', description);
    formData.append('url', postUrl);
    formData.append('additionalNotes', additionalNotes);
    
    if (files) {
      Array.from(files).forEach(file => {
        formData.append('files', file);
      });
    }

    onSubmit(formData);
    handleClose();
  };

  const handleClose = () => {
    setTaskType("");
    setDescription("");
    setPostUrl("");
    setAdditionalNotes("");
    setFiles(null);
    setTermsAccepted(false);
    onClose();
  };

  if (!campaign) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">Submit Your Work</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Campaign Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-black mb-2">{campaign.title}</h4>
            <p className="text-sm text-gray-600">{campaign.description}</p>
            <div className="flex items-center justify-between mt-3">
              <span className="text-success font-semibold">Reward: ${campaign.reward}</span>
              <span className="text-sm text-gray-600">
                Deadline: {campaign.deadline ? new Date(campaign.deadline).toLocaleDateString() : 'No deadline'}
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Task Type Selection */}
            <div className="space-y-2">
              <Label htmlFor="taskType">Task Completion Type</Label>
              <Select value={taskType} onValueChange={setTaskType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select task type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="social-media">Social Media Post</SelectItem>
                  <SelectItem value="content-creation">Content Creation</SelectItem>
                  <SelectItem value="review">Review/Testimonial</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Proof Upload */}
            <div className="space-y-2">
              <Label>Upload Proof (Screenshots, Links, etc.)</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-accent transition-colors duration-200">
                <CloudUpload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">Drag and drop files here, or click to browse</p>
                <p className="text-sm text-gray-500">Supports: JPG, PNG, PDF, TXT (Max 10MB)</p>
                <Input
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.pdf,.txt"
                  onChange={(e) => setFiles(e.target.files)}
                  className="hidden"
                  id="file-upload"
                />
                <Label htmlFor="file-upload" className="cursor-pointer">
                  <Button type="button" variant="outline" className="mt-4">
                    Choose Files
                  </Button>
                </Label>
              </div>
              {files && files.length > 0 && (
                <div className="text-sm text-gray-600">
                  {files.length} file(s) selected
                </div>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description & Links</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide additional details, links to your posts, or any relevant information..."
                rows={4}
              />
            </div>

            {/* Social Media Links */}
            <div className="space-y-2">
              <Label htmlFor="postUrl">Social Media Post URL (if applicable)</Label>
              <Input
                id="postUrl"
                type="url"
                value={postUrl}
                onChange={(e) => setPostUrl(e.target.value)}
                placeholder="https://twitter.com/yourpost or https://instagram.com/p/yourpost"
              />
            </div>

            {/* Additional Notes */}
            <div className="space-y-2">
              <Label htmlFor="additionalNotes">Additional Notes (Optional)</Label>
              <Textarea
                id="additionalNotes"
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Any additional information you'd like to share..."
                rows={3}
              />
            </div>

            {/* Terms Agreement */}
            <div className="flex items-start space-x-3">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
              />
              <Label htmlFor="terms" className="text-sm text-gray-600 leading-relaxed">
                I confirm that I have completed the task as described and the submitted proof is authentic and accurate. I understand that false submissions may result in account suspension.
              </Label>
            </div>

            {/* Submit Buttons */}
            <div className="flex space-x-4">
              <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={!termsAccepted}
                className="flex-1 bg-accent text-white hover:bg-blue-700"
              >
                Submit for Review
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
