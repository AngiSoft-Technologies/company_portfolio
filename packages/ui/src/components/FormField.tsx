import {
  cloneElement,
  isValidElement,
  useId,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react';
import './SharedComponents.css';

/** Accessibility attributes passed to the field control (or available to a render-prop child). */
export interface FormFieldControlProps {
  id: string;
  'aria-describedby': string | undefined;
  'aria-invalid': true | undefined;
  'aria-required': true | undefined;
}

export interface FormFieldProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  label: ReactNode;
  id?: string;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  /**
   * A single control element is cloned with the generated id/ARIA attributes.
   * A function child receives those attributes explicitly for custom controls.
   */
  children: ReactNode | ((control: FormFieldControlProps) => ReactNode);
}

const FormField = ({
  className = '',
  label,
  id,
  hint,
  error,
  required = false,
  children,
  ...props
}: FormFieldProps) => {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;
  const describedBy =
    [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;

  const controlProps: FormFieldControlProps = {
    id: fieldId,
    'aria-describedby': describedBy,
    'aria-invalid': error ? true : undefined,
    'aria-required': required || undefined,
  };

  const control =
    typeof children === 'function'
      ? children(controlProps)
      : isValidElement(children)
        ? cloneElement(
            children as ReactElement<Record<string, unknown>>,
            controlProps as unknown as Record<string, unknown>,
          )
        : children;

  return (
    <div
      {...props}
      data-invalid={error ? 'true' : undefined}
      className={`angisoft-field${className ? ` ${className}` : ''}`}
    >
      <label className="angisoft-field__label" htmlFor={fieldId}>
        {label}
        {required ? (
          <span className="angisoft-field__required" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {control}
      {hint ? (
        <p id={hintId} className="angisoft-field__hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="angisoft-field__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
};

export default FormField;
