import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import { Briefcase, LayoutDashboard, Settings, User, Wallet, FolderKanban, Upload, Plus } from "lucide-react";

export function GlobalCommandPalette() {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };
        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    const runCommand = (command: () => void) => {
        setOpen(false);
        command();
    };

    return (
        <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput placeholder="Type a command or search..." className="border-none focus:ring-0" />
            <CommandList className="glass-panel">
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup heading="Quick Actions">
                    <CommandItem onSelect={() => runCommand(() => navigate("/dashboard"))}>
                        <LayoutDashboard className="mr-2 h-4 w-4 text-primary" />
                        <span>Go to Dashboard</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => navigate("/submit-work"))}>
                        <Upload className="mr-2 h-4 w-4 text-primary" />
                        <span>Submit Work</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => navigate("/start-project"))}>
                        <Briefcase className="mr-2 h-4 w-4 text-primary" />
                        <span>Start a Project</span>
                    </CommandItem>
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup heading="Settings & Account">
                    <CommandItem onSelect={() => runCommand(() => navigate("/edit-profile"))}>
                        <User className="mr-2 h-4 w-4" />
                        <span>Edit Profile</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => navigate("/payments"))}>
                        <Wallet className="mr-2 h-4 w-4" />
                        <span>Payments & Billing</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => navigate("/settings"))}>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Platform Settings</span>
                    </CommandItem>
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    );
}
