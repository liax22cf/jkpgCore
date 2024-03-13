function toggleReadMe() {
    var element = document.querySelector('.readme-container');
    var button = document.querySelector('.readme-button')

    if(element.classList.contains('show')){
        button.textContent = 'Show README File'
        element.classList.toggle('show');
    }
    else{
        button.textContent = 'Hide README File';
        element.classList.toggle('show');
    }
    
}

function toggleCV() {
    var element = document.getElementById('CV');
    var links = document.querySelectorAll('.CV-link');

    element.classList.add('none');
    links.forEach(link => link.classList.toggle('inline'));
}



function toggleLbsConverter() {
    var converter = document.getElementById('converter');
    converter.style.display = converter.style.display === 'none' ? 'block' : 'none';
  }