package com.tic;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class TicApplication {
    public static void main(String[] args) {
        SpringApplication.run(TicApplication.class, args);
    }
}
