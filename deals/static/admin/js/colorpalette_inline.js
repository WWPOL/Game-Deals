/**
 * Click-to-edit functionality for ColorPalette inline
 */
(function($) {
    $(document).ready(function() {
        // Add click handler to preview cells to toggle edit mode
        $(document).on('click', '.inline-group#colorpalette_set-group .field-color_preview', function() {
            var $row = $(this).closest('tr');
            $row.toggleClass('editing');
        });
    });
})(django.jQuery);
