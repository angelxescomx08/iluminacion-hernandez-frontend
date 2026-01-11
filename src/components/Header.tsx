import React from "react";
import {
  Menu,
  Target,
  LayoutGrid,
  Settings,
  LogOut,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function Header() {

  const [open, setOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 md:px-8">

        {/* LADO IZQUIERDO */}
        <div className="flex items-center gap-4">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Abrir menú</span>
              </Button>
            </SheetTrigger>

            <SheetContent side="left" className="w-[300px] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle className="text-left flex items-center gap-2">
                  <Target className="h-6 w-6 text-primary" />
                  Iluminación Hernández
                </SheetTitle>
              </SheetHeader>

              <nav className="flex flex-col gap-4 mt-8">
                <MobileNavLink
                  href="/panel/goals"
                  icon={<Target className="h-5 w-5" />}
                  label="Mis Metas"
                />
                <MobileNavLink
                  href="/panel/units"
                  icon={<LayoutGrid className="h-5 w-5" />}
                  label="Unidades"
                />
                <MobileNavLink
                  href="/panel/settings"
                  icon={<Settings className="h-5 w-5" />}
                  label="Configuración"
                />
              </nav>
            </SheetContent>
          </Sheet>

          <a href="/" className="flex items-center gap-2">
            <Target className="h-6 w-6 text-primary hidden md:block" />
            <span className="font-bold text-xl tracking-tight">
							Iluminación Hernández
						</span>
          </a>

          {/* NAV DESKTOP */}
          <nav className="hidden md:flex items-center gap-6 ml-6">
            <a href="/panel/goals"
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              Metas
            </a>
          </nav>
        </div>

        {/* LADO DERECHO */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10 border">
                  <AvatarImage
                    src={""}
                    alt={"Avatar"}
                  />
                  <AvatarFallback>
                    I
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    Iluminación Hernández
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    iluminacionhernandez@gmail.com
                  </p>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Perfil</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="text-destructive focus:bg-destructive/10"
                onClick={async () => {
                  
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Cerrar Sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

function MobileNavLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <a href={href}
      className="flex items-center gap-3 px-3 py-2 text-lg font-medium rounded-md hover:bg-accent transition-all"
    >
      {icon}
      {label}
    </a>
  );
}
