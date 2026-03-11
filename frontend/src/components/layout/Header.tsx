import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ConnectButton } from '../wallet/ConnectButton';
import { VAULTS } from '@/config/vaults';
import { cn } from '@/lib/utils';
import { Menu, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

export function Header() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  const navLinks = [
    { to: '/', label: 'Dashboard', isActive: pathname === '/' },
    ...VAULTS.map((v) => ({
      to: `/vault/${v.slug}`,
      label: v.name,
      isActive: pathname === `/vault/${v.slug}`,
    })),
  ];

  return (
    <header className="sticky top-0 z-50 w-full h-16 bg-background border-b border-border">
      <div className="container h-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-6">
          {/* Mobile hamburger */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="sm:hidden text-foreground-secondary hover:text-foreground">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-background border-border p-0">
              <SheetHeader className="p-6 pb-4 border-b border-border">
                <SheetTitle className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
                    B
                  </div>
                  <span className="font-sans font-semibold text-[18px] text-foreground">Basalt</span>
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col p-4 gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                      link.isActive
                        ? 'text-foreground bg-background-surface-raised'
                        : 'text-foreground-secondary hover:text-foreground hover:bg-background-surface'
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
                <a
                  href="https://github.com/udoka-osaji/basalt-protocol"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-foreground-secondary hover:text-foreground hover:bg-background-surface inline-flex items-center gap-2"
                >
                  GitHub
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </nav>
              <div className="px-4 mt-4">
                <div className="flex h-6 px-2 rounded-full items-center justify-center bg-warning-muted border border-warning/20 text-warning text-xs w-fit">
                  Testnet
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
              B
            </div>
            <span className="font-sans font-semibold text-[18px] hidden sm:block">Basalt</span>
          </Link>

          <nav className="hidden sm:flex items-center gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  link.isActive
                    ? 'text-foreground bg-background-surface-raised'
                    : 'text-foreground-secondary hover:text-foreground'
                )}
              >
                {link.label}
              </Link>
            ))}
            <a
              href="https://github.com/udoka-osaji/basalt-protocol"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors text-foreground-secondary hover:text-foreground inline-flex items-center gap-1.5"
            >
              GitHub
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex h-6 px-2 rounded-full items-center justify-center bg-warning-muted border border-warning/20 text-warning text-xs">
            Testnet
          </div>
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
