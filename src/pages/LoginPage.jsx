import {
  Activity,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "../context/AuthContext.jsx";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState({ email: "", password: "" });
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [requestError, setRequestError] = useState("");
  const submissionInProgress = useRef(false);

  function handleChange(field, value) {
    setCredentials((currentCredentials) => ({
      ...currentCredentials,
      [field]: value,
    }));
    if (fieldErrors[field]) {
      setFieldErrors((currentErrors) => ({
        ...currentErrors,
        [field]: "",
      }));
    }
    if (requestError) {
      setRequestError("");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submissionInProgress.current) {
      return;
    }

    setRequestError("");
    setIsRecoveringPassword(false);

    const email = credentials.email.trim();
    const nextFieldErrors = {
      email: email ? "" : "Informe sua credencial ou e-mail institucional.",
      password: credentials.password ? "" : "Informe sua senha.",
    };

    setFieldErrors(nextFieldErrors);
    if (nextFieldErrors.email || nextFieldErrors.password) {
      return;
    }

    submissionInProgress.current = true;
    setIsSubmitting(true);
    try {
      await login({ email, password: credentials.password });
      navigate("/", { replace: true });
    } catch (error) {
      setRequestError(error?.response?.data?.detail || "Não foi possível entrar.");
    } finally {
      submissionInProgress.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative isolate flex min-h-svh items-center justify-center overflow-hidden bg-muted/30 px-4 py-8 sm:px-6 lg:px-8">
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-1/2 -z-10 w-full -translate-y-1/2 text-border/60"
        fill="none"
        focusable="false"
        stroke="currentColor"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
        viewBox="0 0 1440 180"
      >
        <path d="M0 103h55l24-40 28 82 34-131 36 150 31-61h113l21-28 26 56 29-98 33 131 34-61h155l21-30 28 58 31-101 34 134 34-61h135l25-35 28 69 32-117 37 144 29-61h139" />
      </svg>

      <div className="flex w-full max-w-5xl flex-col gap-4">
        <Card aria-labelledby="login-title" className="overflow-hidden py-0">
          <div className="grid md:grid-cols-[minmax(0,1.08fr)_minmax(20rem,0.92fr)]">
            <form className="flex flex-col" noValidate onSubmit={handleSubmit}>
              <CardHeader className="gap-3 px-6 pt-8 sm:px-10 sm:pt-10">
                <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
                  ACESSO MÉDICO
                </p>
                <CardTitle>
                  <h1 className="text-3xl font-semibold tracking-tight" id="login-title">
                    Revisão de ECG
                  </h1>
                </CardTitle>
                <div className="flex items-center gap-3 text-primary" aria-hidden="true">
                  <Separator className="flex-1" />
                  <span className="grid size-8 place-items-center rounded-full bg-primary/10">
                    <Activity className="size-4" />
                  </span>
                  <Separator className="flex-1" />
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Entre com seu e-mail institucional BP para acessar a plataforma de validação de
                  exames.
                </p>
              </CardHeader>

              <CardContent className="flex flex-1 flex-col gap-5 px-6 pb-8 sm:px-10 sm:pb-10">
                <FieldGroup>
                  <Field data-invalid={fieldErrors.email ? true : undefined}>
                    <FieldLabel htmlFor="login-credential">E-mail institucional BP</FieldLabel>
                    <InputGroup className="h-10">
                      <InputGroupAddon>
                        <Mail aria-hidden="true" />
                      </InputGroupAddon>
                      <InputGroupInput
                        aria-describedby={fieldErrors.email ? "login-credential-error" : undefined}
                        aria-invalid={fieldErrors.email ? true : undefined}
                        autoComplete="username"
                        autoFocus
                        disabled={isSubmitting}
                        id="login-credential"
                        name="email"
                        onChange={(event) => handleChange("email", event.target.value)}
                        placeholder="medico@dominio-bp"
                        type="text"
                        value={credentials.email}
                      />
                    </InputGroup>
                    <FieldError id="login-credential-error">{fieldErrors.email}</FieldError>
                  </Field>

                  <Field data-invalid={fieldErrors.password ? true : undefined}>
                    <FieldLabel htmlFor="login-password">Senha</FieldLabel>
                    <InputGroup className="h-10">
                      <InputGroupAddon>
                        <LockKeyhole aria-hidden="true" />
                      </InputGroupAddon>
                      <InputGroupInput
                        aria-describedby={fieldErrors.password ? "login-password-error" : undefined}
                        aria-invalid={fieldErrors.password ? true : undefined}
                        autoComplete="current-password"
                        disabled={isSubmitting}
                        id="login-password"
                        name="password"
                        onChange={(event) => handleChange("password", event.target.value)}
                        placeholder="Digite sua senha"
                        type={isPasswordVisible ? "text" : "password"}
                        value={credentials.password}
                      />
                      <InputGroupAddon align="inline-end">
                        <InputGroupButton
                          aria-label={isPasswordVisible ? "Ocultar senha" : "Mostrar senha"}
                          aria-pressed={isPasswordVisible}
                          disabled={isSubmitting}
                          onClick={() => setIsPasswordVisible((currentValue) => !currentValue)}
                          size="icon-xs"
                        >
                          {isPasswordVisible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                        </InputGroupButton>
                      </InputGroupAddon>
                    </InputGroup>
                    <FieldError id="login-password-error">{fieldErrors.password}</FieldError>
                  </Field>
                </FieldGroup>

                <Collapsible
                  className="flex flex-col gap-3"
                  onOpenChange={(open) => {
                    setRequestError("");
                    setIsRecoveringPassword(open);
                  }}
                  open={isRecoveringPassword}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Field className="w-auto" orientation="horizontal">
                      <Checkbox disabled={isSubmitting} id="login-remember" />
                      <FieldLabel htmlFor="login-remember">Lembrar meu acesso</FieldLabel>
                    </Field>
                    <CollapsibleTrigger
                      disabled={isSubmitting}
                      render={<Button size="sm" type="button" variant="link" />}
                    >
                      Esqueci minha senha
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent id="login-recovery-guidance">
                    <Alert role="note">
                      <ShieldCheck aria-hidden="true" />
                      <AlertTitle>Recuperação de acesso</AlertTitle>
                      <AlertDescription className="flex flex-col gap-1">
                        <p>
                          Para recuperar sua senha, contate o administrador responsável pelo
                          cadastro de usuários.
                        </p>
                        <p>Novos usuários não são criados por esta tela.</p>
                      </AlertDescription>
                    </Alert>
                  </CollapsibleContent>
                </Collapsible>

                {requestError ? (
                  <Alert aria-atomic="true" aria-live="assertive" variant="destructive">
                    <AlertTitle>Não foi possível autenticar</AlertTitle>
                    <AlertDescription>{requestError}</AlertDescription>
                  </Alert>
                ) : null}

                <Button
                  aria-busy={isSubmitting}
                  className="w-full"
                  disabled={isSubmitting}
                  size="lg"
                  type="submit"
                >
                  {isSubmitting ? (
                    <Spinner aria-hidden="true" data-icon="inline-start" />
                  ) : (
                    <LockKeyhole aria-hidden="true" data-icon="inline-start" />
                  )}
                  {isSubmitting ? "Entrando..." : "Entrar na plataforma"}
                </Button>

                <div className="flex items-center gap-3" aria-hidden="true">
                  <Separator className="flex-1" />
                  <span className="text-xs text-muted-foreground">ou</span>
                  <Separator className="flex-1" />
                </div>

                {/* TODO: integrar o fluxo OAuth quando o provedor institucional estiver definido. */}
                <Button className="w-full" type="button" variant="outline">
                  <ShieldCheck aria-hidden="true" data-icon="inline-start" />
                  Acessar com outro método
                </Button>
              </CardContent>
            </form>

            <section
              aria-label="Identidade da plataforma de validação de ECG"
              className="relative flex min-h-80 flex-col justify-between overflow-hidden bg-primary px-8 py-10 text-primary-foreground sm:px-10 md:min-h-full"
            >
              <div className="relative flex items-center justify-center gap-5" aria-label="Marcas BP e NSEE">
                <span className="grid min-h-16 min-w-28 place-items-center rounded-lg bg-background p-3">
                  <img className="max-h-10 max-w-24 object-contain" src="/logos/logo_BP.png" alt="BP" />
                </span>
                <Separator className="h-12" orientation="vertical" />
                <span className="grid min-h-16 min-w-28 place-items-center rounded-lg bg-background p-3">
                  <img className="max-h-10 max-w-24 object-contain" src="/logos/logo_NSEE.jpeg" alt="NSEE" />
                </span>
              </div>

              <svg
                aria-hidden="true"
                className="absolute inset-x-0 top-1/2 w-full -translate-y-1/2 text-primary-foreground/30"
                fill="none"
                focusable="false"
                stroke="currentColor"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
                viewBox="0 0 560 160"
              >
                <path d="M0 88h86l18-22 23 45 26-91 31 128 27-60h51l20-24 19 47 29-88 28 124 25-59h58l19-25 24 48 25-23h71" />
              </svg>

              <div className="relative flex flex-col items-center gap-4 text-center">
                <span className="grid size-12 place-items-center rounded-full bg-primary-foreground/15">
                  <ShieldCheck className="size-6" aria-hidden="true" />
                </span>
                <div className="flex flex-col gap-2">
                  <p className="text-lg leading-snug">
                    Plataforma segura para <strong>validação de exames de ECG</strong>
                  </p>
                  <p className="text-sm text-primary-foreground/75">
                    Precisão, confiabilidade e suporte à decisão clínica.
                  </p>
                </div>
              </div>
            </section>
          </div>

          <CardFooter className="justify-center gap-2 text-center text-muted-foreground">
            <LockKeyhole className="size-4 shrink-0" aria-hidden="true" />
            <p>Seus dados são protegidos e seguem os padrões de segurança e privacidade da BP.</p>
          </CardFooter>
        </Card>

        <footer className="flex flex-col items-center justify-between gap-1 px-2 text-center text-xs text-muted-foreground sm:flex-row sm:text-left">
          <p>© 2026 BP • Todos os direitos reservados</p>
          <p>Política de Privacidade • Termos de Uso • Suporte</p>
        </footer>
      </div>
    </main>
  );
}
