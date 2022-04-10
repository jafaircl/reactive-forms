import { AbstractControl, ValidationErrors } from '@angular/forms';
import { defer, merge, Observable, of, Subscription } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { ControlsOf, FormArray, FormControl, FormGroup } from '..';

export function selectControlValue$<T, R>(
  control: any,
  mapFn: (state: T) => R
): Observable<R> {
  return (control.value$ as Observable<any>).pipe(
    map(mapFn),
    distinctUntilChanged()
  );
}

export function controlValueChanges$<T>(
  control: AbstractControl & { getRawValue: () => T }
): Observable<T> {
  return merge(
    defer(() => of(control.getRawValue())),
    control.valueChanges.pipe(map(() => control.getRawValue()))
  ) as Observable<T>;
}

export type ControlState = 'VALID' | 'INVALID' | 'PENDING' | 'DISABLED';

export function controlStatus$<K extends 'disabled' | 'enabled' | 'status'>(
  control: AbstractControl,
  type: K
): Observable<K extends 'status' ? ControlState : boolean> {
  return merge(
    defer(() => of(control[type])),
    control.statusChanges.pipe(
      map(() => control[type]),
      distinctUntilChanged()
    )
  ) as Observable<any>;
}

export function enableControl(
  control: AbstractControl,
  enabled: boolean,
  opts?: any
) {
  if (enabled) {
    control.enable(opts);
  } else {
    control.disable(opts);
  }
}

export function disableControl(
  control: AbstractControl,
  disabled: boolean,
  opts?: any
) {
  enableControl(control, !disabled, opts);
}

export function controlDisabledWhile(
  control: AbstractControl,
  observable: Observable<boolean>,
  opts?: any
): Subscription {
  return observable.subscribe((isDisabled) =>
    disableControl(control, isDisabled, opts)
  );
}

export function controlEnabledWhile(
  control: AbstractControl,
  observable: Observable<boolean>,
  opts?: any
): Subscription {
  return observable.subscribe((isEnabled) =>
    enableControl(control, isEnabled, opts)
  );
}

export function mergeErrors(
  existing: ValidationErrors | null,
  toAdd: ValidationErrors | null
) {
  if (!existing && !toAdd) {
    return null;
  }

  return {
    ...existing,
    ...toAdd,
  };
}

export function removeError(errors: ValidationErrors | null, key: string) {
  if (!errors) {
    return null;
  }

  const updatedErrors = {
    ...errors,
  };

  delete updatedErrors[key];

  return Object.keys(updatedErrors).length > 0 ? updatedErrors : null;
}

export function hasErrorAnd(
  and: 'touched' | 'dirty',
  control: AbstractControl,
  error: string,
  path?: Parameters<AbstractControl['hasError']>[1]
): boolean {
  const hasError = control.hasError(
    error,
    !path || path.length === 0 ? undefined : path
  );
  return hasError && control[and];
}

export function controlErrorChanges$(
  control: AbstractControl,
  errors$: Observable<ValidationErrors | null>
): Observable<ValidationErrors | null> {
  return merge(
    defer(() => of(control.errors)),
    errors$,
    control.valueChanges.pipe(
      map(() => control.errors),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
    )
  );
}

export function markAllDirty(control: AbstractControl): void {
  control.markAsDirty({ onlySelf: true });

  (control as any)._forEachChild(
    (control: any) =>
      control.markAllAsDirty?.() || control.markAsDirty({ onlySelf: true })
  );
}

export function cloneAbstractControl<
  T,
  Control extends AbstractControl = T extends Record<string, any>
    ? FormGroup<ControlsOf<T>>
    : T extends []
    ? FormArray<ControlsOf<T>>
    : FormControl<T>
>(control: Control): Control {
  if (control instanceof FormArray) {
    return cloneFormArray(control) as unknown as Control;
  }
  if (control instanceof FormGroup) {
    return cloneFormGroup(control) as unknown as Control;
  }
  return cloneFormControl(
    control as unknown as FormControl<T>
  ) as unknown as Control;
}

export function cloneFormArray<T>(control: FormArray<T>): FormArray<T> {
  return new FormArray(
    control.controls.map((ctrl) => cloneAbstractControl(ctrl)),
    {
      asyncValidators: control.asyncValidator,
      validators: control.validator,
      updateOn: control.updateOn,
    }
  ) as FormArray<T>;
}

export function cloneFormControl<T>(control: FormControl<T>): FormControl<T> {
  return new FormControl(control.value, {
    asyncValidators: control.asyncValidator,
    validators: control.validator,
    updateOn: control.updateOn,
  });
}

export function cloneFormGroup<T>(control: FormGroup<T>): FormGroup<T> {
  const controls: Record<string, any> = {};
  for (const [key, ctrl] of Object.entries(control.controls)) {
    controls[key] = cloneAbstractControl(ctrl);
  }
  return new FormGroup<T>(controls as T, {
    asyncValidators: control.asyncValidator,
    updateOn: control.updateOn,
    validators: control.validator,
  });
}
