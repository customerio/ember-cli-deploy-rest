module.exports = {
  printWidth: 120,
  trailingComma: 'all',
  overrides: [
    {
      files: ['*.js', '.*.js', '*.ts', '.*.ts'],
      options: {
        singleQuote: true,
      },
    },
  ],
};
