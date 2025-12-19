import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Copy, Share2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ShareDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    propertyId: string;
    propertyTitle: string;
}

export function ShareDialog({ open, onOpenChange, propertyId, propertyTitle }: ShareDialogProps) {
    const [copied, setCopied] = useState(false);

    // Generate the share link
    const shareUrl = `${window.location.origin}/properties/${propertyId}`;

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Share2 className="h-5 w-5 text-primary-600" />
                        Share Property
                    </DialogTitle>
                    <DialogDescription>
                        Share this property with others
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Property Title */}
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
                            {propertyTitle}
                        </p>
                    </div>

                    {/* Share Link */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Share Link
                        </label>
                        <div className="flex gap-2">
                            <Input
                                value={shareUrl}
                                readOnly
                                className="flex-1 bg-white dark:bg-gray-900 text-sm"
                                onClick={(e) => e.currentTarget.select()}
                            />
                            <Button
                                onClick={handleCopyLink}
                                className="shrink-0 bg-gradient-primary hover:opacity-90 transition-opacity"
                                size="default"
                            >
                                <AnimatePresence mode="wait">
                                    {copied ? (
                                        <motion.div
                                            key="check"
                                            initial={{ scale: 0, rotate: -180 }}
                                            animate={{ scale: 1, rotate: 0 }}
                                            exit={{ scale: 0, rotate: 180 }}
                                            transition={{ duration: 0.2 }}
                                            className="flex items-center gap-2"
                                        >
                                            <Check className="h-4 w-4" />
                                            <span>Copied!</span>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="copy"
                                            initial={{ scale: 0, rotate: 180 }}
                                            animate={{ scale: 1, rotate: 0 }}
                                            exit={{ scale: 0, rotate: -180 }}
                                            transition={{ duration: 0.2 }}
                                            className="flex items-center gap-2"
                                        >
                                            <Copy className="h-4 w-4" />
                                            <span>Copy</span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </Button>
                        </div>
                    </div>

                    {/* Success Message */}
                    <AnimatePresence>
                        {copied && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="flex items-center gap-2 text-sm text-success-600 dark:text-success-400"
                            >
                                <Check className="h-4 w-4" />
                                <span>Link copied to clipboard!</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </DialogContent>
        </Dialog>
    );
}
