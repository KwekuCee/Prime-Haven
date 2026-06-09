import { motion } from 'framer-motion';
import { Target, CheckCircle, Circle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface ProfileCompletenessProps {
    profile: any;
    designer: any;
    submissions: any[];
}

const ProfileCompleteness = ({ profile, designer, submissions }: ProfileCompletenessProps) => {
    const navigate = useNavigate();

    if (!profile || !designer) return null;

    const checks = [
        { label: 'Basic Account Created', done: true },
        { label: 'Verify Email Address', done: !!profile.email_verified },
        { label: 'Complete Registration Fee', done: !!profile.registration_fee_paid },
        { label: 'Set Professional Title', done: designer.professional_title && designer.professional_title !== 'Graphic Designer' },
        { label: 'Submit First Work', done: submissions && submissions.length > 0 },
    ];

    const completedCount = checks.filter(c => c.done).length;
    const percentage = Math.round((completedCount / checks.length) * 100);

    if (percentage === 100) return null; // Hide when fully complete!

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-5 sm:p-6 rounded-2xl glass border border-primary/20 bg-background/40 backdrop-blur-md relative overflow-hidden"
        >
            <div className="absolute right-0 top-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">

                {/* Glowing Progress Ring */}
                <div className="relative w-24 h-24 flex-shrink-0">
                    <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                        <circle
                            cx="50" cy="50" r="42"
                            fill="none"
                            stroke="hsl(var(--primary))"
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={`${(percentage / 100) * 264} 264`}
                            className="transition-all duration-1000 ease-out drop-shadow-[0_0_8px_hsl(var(--primary))]"
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                        <span className="text-xl font-heading font-bold text-foreground">{percentage}%</span>
                    </div>
                </div>

                {/* Text & Checklist */}
                <div className="flex-1 min-w-0 w-full">
                    <h3 className="text-lg font-heading font-bold text-foreground mb-1">Complete your profile setup</h3>
                    <p className="text-xs text-muted-foreground mb-4">Complete these steps to maximize your visibility and ranking on the leaderboard.</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4">
                        {checks.map((check, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                                {check.done ? (
                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                    <Circle className="w-3.5 h-3.5 text-muted-foreground/40" />
                                )}
                                <span className={`text-[11px] font-medium ${check.done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                                    {check.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* CTA */}
                <div className="flex-shrink-0 w-full md:w-auto mt-4 md:mt-0">
                    <Button onClick={() => navigate('/settings')} className="w-full md:w-auto text-xs px-6 glow-primary">
                        Resume Setup <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </Button>
                </div>

            </div>
        </motion.div>
    );
};

export default ProfileCompleteness;
