module.exports = {  
    apps: [  
      {  
        name: "Colab-App",  
        script: "index.js",  
        instances: "3",  
        exec_mode: "cluster",  
        watch: true,  
        max_memory_restart: "1G",  
        log_date_format: "YYYY-MM-DD HH:mm Z",  
        env_dev: {  
          NODE_ENV: "development",  
        },  
        env_prod: {  
          NODE_ENV: "production",  
        },  
      },  
    ],  
  };