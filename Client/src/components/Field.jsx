export default function Field({ id, label, error, action, className = '', ...inputProps }) {
  const classes = ['field']

  if (error) classes.push('field--error')
  if (action) classes.push('field--action')
  if (className) classes.push(className)

  return (
    <div className={classes.join(' ')}>
      <label htmlFor={id}>{label}</label>
      <div className="field__control">
        <input id={id} aria-invalid={error ? 'true' : undefined} {...inputProps} />
        {action}
      </div>
      {error && (
        <span className="field__error" role="alert">
          {error}
        </span>
      )}
    </div>
  )
}
