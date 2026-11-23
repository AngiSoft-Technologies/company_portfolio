/**
 * Compile-time component contract for @angisoft/ui.
 *
 * The UI package intentionally has no runtime test runner yet (only `lint` and
 * `typecheck` scripts), so these assertions catch prop/API regressions at
 * typecheck time: Button keeps its native button surface and variant/size
 * unions; the new primitives keep the generic, accessible props the apps rely
 * on; and every component is present on the package's public export surface.
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { ButtonProps } from './Button';
import type { DataTableColumn, DataTableProps } from './DataTable';
import type { FormFieldControlProps, FormFieldProps } from './FormField';
import type { GalleryItem } from './Gallery';
import type { NavLinkItem } from './Nav';

type Assert<T extends true> = T;
type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
  ? true
  : false;

/* Button — public props and variant/size surface must not regress. */
type _ButtonExtendsNativeProps = Assert<
  ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> ? true : false
>;
type _ButtonVariantsPreserved = Assert<
  Equals<NonNullable<ButtonProps['variant']>, 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'>
>;
type _ButtonSizesPreserved = Assert<Equals<NonNullable<ButtonProps['size']>, 'sm' | 'md' | 'lg'>>;
type _ButtonSupportsLoading = Assert<Equals<ButtonProps['loading'], boolean | undefined>>;

/* DataTable — generic rows/columns and per-cell custom rendering. */
type ContractRow = { id: string; name: string };
type _DataTableAcceptsRows = Assert<
  { rows: ContractRow[]; columns: DataTableColumn<ContractRow>[] } extends DataTableProps<ContractRow>
    ? true
    : false
>;
type _DataTableCellRenderer = Assert<
  Equals<NonNullable<DataTableColumn<ContractRow>['render']>, (row: ContractRow, index: number) => ReactNode>
>;

/* FormField — generated ARIA attributes and render-prop control. */
type _FormFieldControlAria = Assert<
  Equals<keyof FormFieldControlProps, 'id' | 'aria-describedby' | 'aria-invalid' | 'aria-required'>
>;
type _FormFieldRenderProp = Assert<
  ((control: FormFieldControlProps) => ReactNode) extends FormFieldProps['children'] ? true : false
>;

/* Gallery — every image must declare accessible alt text. */
type _GalleryAltRequired = Assert<Equals<GalleryItem['alt'], string>>;
type _NavLinkHrefRequired = Assert<Equals<NavLinkItem['href'], string>>;

/* Package export surface. */
type PublicApi = typeof import('../index');
type _NavExported = Assert<'Nav' extends keyof PublicApi ? true : false>;
type _FooterExported = Assert<'Footer' extends keyof PublicApi ? true : false>;
type _FormFieldExported = Assert<'FormField' extends keyof PublicApi ? true : false>;
type _DataTableExported = Assert<'DataTable' extends keyof PublicApi ? true : false>;
type _EmptyStateExported = Assert<'EmptyState' extends keyof PublicApi ? true : false>;
type _GalleryExported = Assert<'Gallery' extends keyof PublicApi ? true : false>;
type _CtaBlockExported = Assert<'CtaBlock' extends keyof PublicApi ? true : false>;
